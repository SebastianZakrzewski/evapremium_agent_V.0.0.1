import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { Mastra } from '@mastra/core';
import { SimpleAuth } from '@mastra/core/server';
import { MastraCompositeStore } from '@mastra/core/storage';
import { DuckDBStore } from '@mastra/duckdb';
import { MastraEditor } from '@mastra/editor';
import { LibSQLStore } from '@mastra/libsql';
import { MastraStorageExporter, Observability, SamplingStrategyType } from '@mastra/observability';
import type { AgentEventSink } from '../agent-events/agent-event';
import type { ShopTools } from '../chat/shop-tools';
import {
  createEvaMastraAgent,
  EVA_SHOP_AGENT_KEY,
} from './create-eva-mastra-agent';
import { resolveMastraObservabilityPath } from './mastra-observability-path';
import { createEvaQualifierAgent } from './intents/create-eva-qualifier-agent';
import { createIntentWorkflow } from './intents/create-intent-workflow';
import type { IntentQualifier } from './intents/intent-qualifier';
import { MastraIntentQualifier } from './intents/mastra-intent-qualifier';
import { StubIntentQualifier } from './intents/stub-intent-qualifier';
import { MASTRA_HTTP_PREFIX } from './studio-http';

export const DEFAULT_MASTRA_STORAGE_URL = 'file:.mastra/editor.db';

function studioQualifier(): IntentQualifier {
  return process.env.DEEPSEEK_API_KEY
    ? new MastraIntentQualifier(createEvaQualifierAgent())
    : new StubIntentQualifier();
}

function ensureFileStorageDir(url: string): void {
  if (!url.startsWith('file:') || url === 'file::memory:') {
    return;
  }
  const filePath = url.slice('file:'.length);
  if (filePath === ':memory:') {
    return;
  }
  mkdirSync(dirname(filePath), { recursive: true });
}

function studioAuth() {
  const token = process.env.MASTRA_STUDIO_TOKEN?.trim();
  if (!token) {
    return undefined;
  }
  return new SimpleAuth({
    tokens: { [token]: { id: 'eva-studio', name: 'Mastra Studio' } },
    protected: [new RegExp(`^${MASTRA_HTTP_PREFIX}(?:/|$)`)],
  });
}

export type CreateEvaMastraOptions = {
  storageUrl?: string;
  observabilityPath?: string;
};

export function createEvaMastra(
  tools: ShopTools,
  options?: CreateEvaMastraOptions,
  events?: AgentEventSink,
): Mastra {
  const storageUrl =
    options?.storageUrl ??
    process.env.MASTRA_STORAGE_URL ??
    DEFAULT_MASTRA_STORAGE_URL;
  const observabilityPath = resolveMastraObservabilityPath({
    storageUrl,
    observabilityPath: options?.observabilityPath,
    env: process.env,
  });
  ensureFileStorageDir(storageUrl);
  ensureFileStorageDir(`file:${observabilityPath}`);
  const auth = studioAuth();
  return new Mastra({
    storage: new MastraCompositeStore({
      id: 'eva-mastra-storage',
      default: new LibSQLStore({
        id: 'eva-mastra-libsql',
        url: storageUrl,
      }),
      domains: {
        observability: new DuckDBStore({
          id: 'eva-mastra-observability',
          path: observabilityPath,
          memoryLimit: '512MB',
          threads: 1,
        }).observability,
      },
    }),
    editor: new MastraEditor(),
    observability: new Observability({
      configs: {
        default: {
          serviceName: 'eva-bot',
          sampling: { type: SamplingStrategyType.ALWAYS },
          exporters: [new MastraStorageExporter()],
        },
      },
    }),
    ...(auth ? { server: { auth } } : {}),
    agents: {
      [EVA_SHOP_AGENT_KEY]: createEvaMastraAgent(tools, events),
      evaIntentQualifier: createEvaQualifierAgent(),
    },
    workflows: {
      evaIntentWorkflow: createIntentWorkflow(studioQualifier()),
    },
  });
}
