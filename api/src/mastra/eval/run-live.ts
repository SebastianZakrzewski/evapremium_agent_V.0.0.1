import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { InMemoryAgentEvents } from '../../agent-events/in-memory-agent-events';
import { MastraChatAgent } from '../../chat/mastra-chat.agent';
import { ShopTools } from '../../chat/shop-tools';
import { ContextTreeResolver } from '../../context-tree/context-tree.resolver';
import { OpenAiTextEmbedder } from '../../context-tree/embeddings/openai-text-embedder';
import { InMemoryContextLeafVectors } from '../../context-tree/in-memory/in-memory-context-leaf-vectors';
import { InMemoryContextNodeCatalog } from '../../context-tree/in-memory/in-memory-context-node-catalog';
import { loadContextLeafVectors } from '../../context-tree/supabase/load-embeddings';
import { loadContextNodes } from '../../context-tree/supabase/load-nodes';
import type { ContextLeafSearchHit } from '../../domain/context-leaf-search';
import type { ContextLeafLookupResult } from '../../domain/context-tree';
import type { QuotePriceInput, QuotePriceResult } from '../../domain/pricing';
import type {
  TemplateCascadeInput,
  TemplateCascadeResult,
} from '../../domain/template-cascade';
import { createEvaMastraAgent } from '../create-eva-mastra-agent';
import {
  EFFECTIVENESS_SCENARIOS,
  aggregateEffectiveness,
  type ScenarioTrace,
  type ToolCallTrace,
} from './agent-effectiveness';
import { createEvaQualifierAgent } from '../intents/create-eva-qualifier-agent';
import { InMemoryIntentSessionState } from '../intents/intent-session-state';
import { MastraIntentQualifier } from '../intents/mastra-intent-qualifier';
import type { ShopIntent } from '../intents/schema';
import { createShopToolCatalog } from '../tools/create-shop-tool-catalog';
import {
  InMemoryPricingCategoryVariantCatalog,
  InMemoryPricingMatrixCatalog,
  InMemoryPricingVariantCatalog,
} from '../../pricing/in-memory/in-memory-pricing-catalogs';
import { PricingResolver } from '../../pricing/pricing.resolver';
import { loadPricingLists } from '../../pricing/supabase/load-pricing';
import { createSupabaseDataStore } from '../../supabase/supabase-data-store';
import {
  InMemoryAliasCatalog,
  InMemoryTemplateCatalog,
} from '../../templates/in-memory/in-memory-catalogs';
import {
  loadMatTemplates,
  loadVehicleSlotAliases,
} from '../../templates/supabase/load-catalog';
import { TemplateCascadeResolver } from '../../templates/template-cascade.resolver';

const here = __dirname;

function applyEnvFile(path: string): void {
  let text: string;
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    return;
  }
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
      continue;
    }
    const eq = trimmed.indexOf('=');
    const key = trimmed.slice(0, eq);
    const value = trimmed.slice(eq + 1);
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function applyProviderJson(path: string): void {
  try {
    const cfg = JSON.parse(readFileSync(path, 'utf8')) as Record<
      string,
      { api_key?: string; key?: string; url?: string }
    >;
    const deepseek = cfg['deepseek-api-key']?.api_key;
    if (deepseek && !process.env.DEEPSEEK_API_KEY) {
      process.env.DEEPSEEK_API_KEY = deepseek;
    }
    const supabase = cfg['supabase-service-role-key'];
    if (supabase?.url && !process.env.SUPABASE_URL) {
      process.env.SUPABASE_URL = supabase.url;
    }
    if (supabase?.key && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      process.env.SUPABASE_SERVICE_ROLE_KEY = supabase.key;
    }
    const openai = cfg['openai-api-key']?.api_key;
    if (openai && !process.env.OPENAI_API_KEY) {
      process.env.OPENAI_API_KEY = openai;
    }
  } catch {
    /* optional */
  }
}

export function loadEffectivenessEnv(): void {
  const root = resolve(here, '../../../..');
  applyEnvFile(resolve(root, 'api/.env'));
  applyProviderJson(resolve(root, 'docs/provider_configuration.json'));
}

class RecordingShopTools extends ShopTools {
  calls: ToolCallTrace[] = [];

  override resolveTemplate(input: TemplateCascadeInput): TemplateCascadeResult {
    const output = super.resolveTemplate(input);
    this.calls.push({
      id: 'resolve-template',
      input: input as unknown as Record<string, unknown>,
      output,
    });
    return output;
  }

  override quotePrice(input: QuotePriceInput): QuotePriceResult {
    const output = super.quotePrice(input);
    this.calls.push({
      id: 'quote-price',
      input: input as unknown as Record<string, unknown>,
      output,
    });
    return output;
  }

  override lookupLeaf(slug: string): ContextLeafLookupResult {
    const output = super.lookupLeaf(slug);
    this.calls.push({
      id: 'lookup-leaf',
      input: { slug },
      output,
    });
    return output;
  }

  override async searchLeaves(query: string): Promise<ContextLeafSearchHit[]> {
    const output = await super.searchLeaves(query);
    this.calls.push({
      id: 'search-leaves',
      input: { query },
      output,
    });
    return output;
  }
}

export async function runEffectivenessSuite(label: string) {
  loadEffectivenessEnv();
  if (!process.env.DEEPSEEK_API_KEY?.trim()) {
    throw new Error('DEEPSEEK_API_KEY missing');
  }
  if (!process.env.OPENAI_API_KEY?.trim()) {
    throw new Error('OPENAI_API_KEY missing');
  }
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase env missing');
  }

  const store = createSupabaseDataStore();
  const [nodes, vectors, templates, aliases, pricing] = await Promise.all([
    loadContextNodes(store),
    loadContextLeafVectors(store),
    loadMatTemplates(store),
    loadVehicleSlotAliases(store),
    loadPricingLists(store),
  ]);
  const events = new InMemoryAgentEvents();
  const openaiKey = process.env.OPENAI_API_KEY;
  const tools = new RecordingShopTools(
    new TemplateCascadeResolver(
      new InMemoryTemplateCatalog(templates),
      new InMemoryAliasCatalog(aliases),
    ),
    new PricingResolver(
      new InMemoryPricingVariantCatalog(pricing.variants),
      new InMemoryPricingCategoryVariantCatalog(pricing.categoryVariants),
      new InMemoryPricingMatrixCatalog(pricing.matrix),
    ),
    new ContextTreeResolver(
      new InMemoryContextNodeCatalog(nodes),
      new OpenAiTextEmbedder(openaiKey),
      new InMemoryContextLeafVectors(vectors),
    ),
    events,
  );
  const agent = new MastraChatAgent(
    createEvaMastraAgent(createShopToolCatalog(tools, events)),
    new MastraIntentQualifier(createEvaQualifierAgent()),
    new InMemoryIntentSessionState(),
    events,
  );

  const traces: ScenarioTrace[] = [];
  for (const scenario of EFFECTIVENESS_SCENARIOS) {
    tools.calls = [];
    const sessionId = randomUUID();
    const turn = await agent.handle(scenario.message, sessionId);
    const sessionEvents = await events.listBySession(sessionId);
    const accepted = sessionEvents.find((row) => row.type === 'intent_accepted');
    traces.push({
      scenario,
      acceptedIntent: accepted?.payload.intent as ShopIntent | undefined,
      calls: [...tools.calls],
      answer: turn.text,
    });
  }
  return aggregateEffectiveness(traces, label);
}

async function main(): Promise<void> {
  const label = process.env.EVAL_LABEL ?? 'run';
  const report = await runEffectivenessSuite(label);
  const dir = resolve(here, '../../../../docs/eval');
  mkdirSync(dir, { recursive: true });
  const out = resolve(dir, `agent-effectiveness-${label}.json`);
  writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
  console.log(
    JSON.stringify({ out, rates: report.rates, weighted: report.weighted }, null, 2),
  );
}

if (require.main === module) {
  void main();
}
