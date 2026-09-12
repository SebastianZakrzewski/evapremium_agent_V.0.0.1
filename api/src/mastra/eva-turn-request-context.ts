import { RequestContext } from '@mastra/core/request-context';
import { profileOrOutOfScope } from './intents/intent-fallback';
import { assembleTurnInstructions } from './intents/prepare-intent-turn';
import { selectTurnTools } from './intents/select-turn-tools';
import type { ShopIntent } from './intents/schema';

export const EVA_TURN_INTENT_KEY = 'intent' as const;

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

export function instructionsForRequestContext(requestContext: {
  get: (key: typeof EVA_TURN_INTENT_KEY) => ShopIntent | undefined;
}): string {
  return assembleTurnInstructions(
    profileOrOutOfScope(shopIntentFromContext(requestContext)),
  );
}

export function toolsForRequestContext<T>(
  catalog: Record<string, T>,
  requestContext: {
    get: (key: typeof EVA_TURN_INTENT_KEY) => ShopIntent | undefined;
  },
): Record<string, T> {
  return selectTurnTools(
    catalog,
    profileOrOutOfScope(shopIntentFromContext(requestContext)).tools,
  );
}
