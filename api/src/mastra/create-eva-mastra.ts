import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { Mastra } from '@mastra/core';
import { MastraEditor } from '@mastra/editor';
import { LibSQLStore } from '@mastra/libsql';
import type { ShopTools } from '../chat/shop-tools';
import {
  createEvaMastraAgent,
  EVA_SHOP_AGENT_KEY,
} from './create-eva-mastra-agent';
import { createEvaQualifierAgent } from './intents/create-eva-qualifier-agent';
import { createIntentWorkflow } from './intents/create-intent-workflow';
import type { IntentQualifier } from './intents/intent-qualifier';
import { MastraIntentQualifier } from './intents/mastra-intent-qualifier';
import { StubIntentQualifier } from './intents/stub-intent-qualifier';

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

export type CreateEvaMastraOptions = {
  storageUrl?: string;
};

export function createEvaMastra(
  tools: ShopTools,
  options?: CreateEvaMastraOptions,
): Mastra {
  const storageUrl =
    options?.storageUrl ??
    process.env.MASTRA_STORAGE_URL ??
    DEFAULT_MASTRA_STORAGE_URL;
  ensureFileStorageDir(storageUrl);
  return new Mastra({
    storage: new LibSQLStore({
      id: 'eva-mastra-storage',
      url: storageUrl,
    }),
    editor: new MastraEditor(),
    agents: {
      [EVA_SHOP_AGENT_KEY]: createEvaMastraAgent(tools),
      evaIntentQualifier: createEvaQualifierAgent(),
    },
    workflows: {
      evaIntentWorkflow: createIntentWorkflow(studioQualifier()),
    },
  });
}
