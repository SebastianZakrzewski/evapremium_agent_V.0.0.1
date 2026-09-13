import { RequestContext } from '@mastra/core/request-context';
import { profileOrOutOfScope } from './intents/intent-fallback';
import { assembleTurnInstructions } from './intents/prepare-intent-turn';
import { selectTurnTools } from './intents/select-turn-tools';
import type { ShopIntent } from './intents/schema';
import {
  instructionsFromPublishedPromptBlocks,
  promptBlockReaderFromMastra,
  type MastraWithPromptEditor,
} from './prompt-block-instructions';

export const EVA_TURN_INTENT_KEY = 'intent' as const;
export const MASTRA_IS_STUDIO_KEY = 'mastra__isStudio' as const;

export type EvaTurnRequestContext = {
  intent: ShopIntent;
};

export function createEvaTurnRequestContext(
  intent: ShopIntent,
): RequestContext<EvaTurnRequestContext> {
  const requestContext = new RequestContext<EvaTurnRequestContext>();
  requestContext.set(EVA_TURN_INTENT_KEY, intent);
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
  const fromBlocks = await instructionsFromPublishedPromptBlocks(
    promptBlockReaderFromMastra(mastra),
    intent,
  );
  if (fromBlocks) {
    return fromBlocks;
  }
  return assembleTurnInstructions(profileOrOutOfScope(intent));
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

  return selectTurnTools(
    catalog,
    profileOrOutOfScope(intent ?? 'out_of_scope').tools,
  );
}
