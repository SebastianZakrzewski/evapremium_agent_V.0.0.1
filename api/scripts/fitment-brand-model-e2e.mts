import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  resolveClassifiedTemplate,
  resolveTemplate,
  type MatTemplate,
  type TemplateCascadeResult,
  type VehicleKeyClassifier,
  type VehicleSlotAlias,
} from '../src/domain/template-cascade';
import { vehicleKeyClassifierFromEnv } from '../src/mastra/vehicle-keys/mastra-vehicle-key-classifier';
import { createSupabaseDataStore } from '../src/supabase/supabase-data-store';
import {
  loadMatTemplates,
  loadVehicleSlotAliases,
} from '../src/templates/supabase/load-catalog';

function applyEnvFile(path: string): void {
  let text: string;
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    return;
  }
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const eq = trimmed.indexOf('=');
    const key = trimmed.slice(0, eq);
    if (!process.env[key]) process.env[key] = trimmed.slice(eq + 1);
  }
}

function applyProviderJson(path: string): void {
  const cfg = JSON.parse(readFileSync(path, 'utf8')) as Record<
    string,
    { api_key?: string; url?: string; key?: string }
  >;
  const deepseek = cfg['deepseek-api-key']?.api_key;
  if (deepseek && !process.env.DEEPSEEK_API_KEY) process.env.DEEPSEEK_API_KEY = deepseek;
  const supabase = cfg['supabase-service-role-key'];
  if (supabase?.url && !process.env.SUPABASE_URL) process.env.SUPABASE_URL = supabase.url;
  if (supabase?.key && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    process.env.SUPABASE_SERVICE_ROLE_KEY = supabase.key;
  }
}

applyEnvFile(resolve(__dirname, '../.env'));
applyProviderJson(resolve(__dirname, '../../docs/provider_configuration.json'));

type Pair = {
  brand: string;
  model: string;
  year: number;
  body?: string;
};

type Verdict = {
  brand: string;
  model: string;
  mode: 'alias' | 'classifier';
  ok: boolean;
  status: string;
  keys: string[];
  calls: number;
  error?: string;
};

function yearInside(template: MatTemplate): number {
  const from = template.yearFrom ?? 2020;
  if (template.isOpenEnded || template.yearTo === null) return from;
  return from;
}

function pairsFrom(templates: MatTemplate[]): Pair[] {
  const seen = new Set<string>();
  const pairs: Pair[] = [];
  for (const template of templates) {
    if (!template.isActive) continue;
    const id = `${template.brandKey}\0${template.modelKey}`;
    if (seen.has(id)) continue;
    seen.add(id);
    pairs.push({
      brand: template.brandKey,
      model: template.modelKey,
      year: yearInside(template),
      body: template.bodyTypeKey ?? undefined,
    });
  }
  return pairs.sort((left, right) =>
    `${left.brand}\0${left.model}`.localeCompare(`${right.brand}\0${right.model}`),
  );
}

function keysOf(result: TemplateCascadeResult): string[] {
  if (result.status === 'none') return [];
  if (result.status === 'one') return [result.template.modelKey];
  return [...new Set(result.templates.map((row) => row.modelKey))];
}

function correct(result: TemplateCascadeResult, model: string): boolean {
  const keys = keysOf(result);
  return keys.length > 0 && keys.every((key) => key === model);
}

function counting(real: VehicleKeyClassifier): VehicleKeyClassifier & { take(): number } {
  let calls = 0;
  const modelCache = new Map<string, string[]>();
  const brandCache = new Map<string, string | null>();
  return {
    take() {
      const value = calls;
      calls = 0;
      return value;
    },
    async classifyBrand(input) {
      const key = JSON.stringify(input);
      if (brandCache.has(key)) return brandCache.get(key) ?? null;
      calls += 1;
      const value = await real.classifyBrand(input);
      brandCache.set(key, value);
      return value;
    },
    async classifyModel(input) {
      const key = JSON.stringify(input);
      const hit = modelCache.get(key);
      if (hit) return hit;
      calls += 1;
      const value = await real.classifyModel(input);
      modelCache.set(key, value);
      return value;
    },
  };
}

async function mapPool<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function run(): Promise<void> {
    for (;;) {
      const index = next;
      next += 1;
      if (index >= items.length) return;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: limit }, () => run()));
  return results;
}

async function main(): Promise<void> {
  const store = createSupabaseDataStore();
  const [templates, aliases] = await Promise.all([
    loadMatTemplates(store),
    loadVehicleSlotAliases(store),
  ]);
  const real = vehicleKeyClassifierFromEnv();
  if (!real) throw new Error('DEEPSEEK_API_KEY missing');
  const pairs = pairsFrom(templates);
  const outDir = resolve(__dirname, '../../docs/eval');
  mkdirSync(outDir, { recursive: true });
  const out = resolve(outDir, 'fitment-brand-model-e2e.jsonl');
  writeFileSync(out, '');
  const classifier = counting(real);

  const aliasVerdicts: Verdict[] = [];
  for (const pair of pairs) {
    const result = resolveTemplate(
      { brand: pair.brand, model: pair.model, year: pair.year, bodyType: pair.body },
      templates,
      aliases,
    );
    aliasVerdicts.push({
      brand: pair.brand,
      model: pair.model,
      mode: 'alias',
      ok: correct(result, pair.model),
      status: result.status,
      keys: keysOf(result),
      calls: 0,
    });
  }
  appendFileSync(out, aliasVerdicts.map((row) => JSON.stringify(row)).join('\n') + '\n');

  let classifiedDone = 0;
  let failedSoFar = 0;
  const classified = await mapPool(pairs, 4, async (pair) => {
    let verdict: Verdict;
    try {
      const result = await resolveClassifiedTemplate(
        { brand: pair.brand, model: pair.model, year: pair.year, bodyType: pair.body },
        templates,
        aliases,
        classifier,
      );
      verdict = {
        brand: pair.brand,
        model: pair.model,
        mode: 'classifier',
        ok: correct(result, pair.model),
        status: result.status,
        keys: keysOf(result),
        calls: 0,
      };
    } catch (error) {
      verdict = {
        brand: pair.brand,
        model: pair.model,
        mode: 'classifier',
        ok: false,
        status: 'error',
        keys: [],
        calls: 0,
        error: error instanceof Error ? error.message : 'error',
      };
    }
    classifiedDone += 1;
    if (!verdict.ok) failedSoFar += 1;
    appendFileSync(out, `${JSON.stringify(verdict)}\n`);
    if (classifiedDone % 50 === 0 || classifiedDone === pairs.length) {
      console.log(JSON.stringify({ classifiedDone, of: pairs.length, failedSoFar }));
    }
    return verdict;
  });

  const rows = [...aliasVerdicts, ...classified];
  const summarize = (mode: Verdict['mode']) => {
    const slice = rows.filter((row) => row.mode === mode);
    const failed = slice.filter((row) => !row.ok);
    return {
      mode,
      total: slice.length,
      passed: slice.length - failed.length,
      failed: failed.length,
      none: failed.filter((row) => row.status === 'none').length,
      wrongKey: failed.filter((row) => row.status !== 'none' && row.status !== 'error').length,
      errors: failed.filter((row) => row.status === 'error').length,
    };
  };
  console.log(JSON.stringify({ pairs: pairs.length, alias: summarize('alias'), classifier: summarize('classifier'), out }, null, 2));
}

void main();
