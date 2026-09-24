import { RequestContext } from '@mastra/core/request-context';
import { profileOrOutOfScope } from './intents/intent-fallback';
import { assembleTurnInstructions } from './intents/prepare-intent-turn';
import { selectTurnTools } from './intents/select-turn-tools';
import type { ShopIntent, ShopToolId } from './intents/schema';
import {
  instructionsFromPublishedPromptBlocks,
  promptBlockReaderFromMastra,
  type MastraWithPromptEditor,
} from './prompt-block-instructions';

export const EVA_TURN_INTENT_KEY = 'intent' as const;
export const EVA_TURN_TOOL_IDS_KEY = 'toolIds' as const;
export const EVA_TURN_EXECUTION_NOTE_KEY = 'executionNote' as const;
export const MASTRA_IS_STUDIO_KEY = 'mastra__isStudio' as const;

export type EvaTurnRequestContext = {
  intent: ShopIntent;
  toolIds?: ShopToolId[];
  executionNote?: string;
};

export function createEvaTurnRequestContext(
  intent: ShopIntent,
  extras?: {
    toolIds?: readonly ShopToolId[];
    executionNote?: string;
  },
): RequestContext<EvaTurnRequestContext> {
  const requestContext = new RequestContext<EvaTurnRequestContext>();
  requestContext.set(EVA_TURN_INTENT_KEY, intent);
  if (extras?.toolIds !== undefined) {
    requestContext.set(EVA_TURN_TOOL_IDS_KEY, [...extras.toolIds]);
  }
  if (extras?.executionNote) {
    requestContext.set(EVA_TURN_EXECUTION_NOTE_KEY, extras.executionNote);
  }
  return requestContext;
}

export function shopIntentFromContext(requestContext: {
  get: (key: typeof EVA_TURN_INTENT_KEY) => ShopIntent | undefined;
}): ShopIntent {
  return requestContext.get(EVA_TURN_INTENT_KEY) ?? 'out_of_scope';
}

export async function instructionsForRequestContext(
  requestContext: {
    get: (key: typeof EVA_TURN_INTENT_KEY) => ShopIntent | undefined;
  },
  mastra?: MastraWithPromptEditor,
): Promise<string> {
  const intent = shopIntentFromContext(requestContext);
  const note = (
    requestContext as { get: (key: string) => unknown }
  ).get(EVA_TURN_EXECUTION_NOTE_KEY);
  const base =
    (await instructionsFromPublishedPromptBlocks(
      promptBlockReaderFromMastra(mastra),
      intent,
    )) ?? assembleTurnInstructions(profileOrOutOfScope(intent));
  if (typeof note === 'string' && note.trim() !== '') {
    return `${base}\n\n${note}`;
  }
  return base;
}

export function toolsForRequestContext<T>(
  catalog: Record<string, T>,
  requestContext: Pick<RequestContext, 'get'>,
): Record<string, T> {
  const intent = requestContext.get(EVA_TURN_INTENT_KEY) as
    | ShopIntent
    | undefined;
  const isStudio = requestContext.get(MASTRA_IS_STUDIO_KEY) === true;

  if (isStudio && intent === undefined) {
    return catalog;
  }

  const override = requestContext.get(EVA_TURN_TOOL_IDS_KEY) as
    | readonly string[]
    | undefined;
  const toolIds =
    override ?? profileOrOutOfScope(intent ?? 'out_of_scope').tools;
  return selectTurnTools(catalog, toolIds);
}
