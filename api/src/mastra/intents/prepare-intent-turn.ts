import { acceptIntentTransition } from './accept-intent-transition';
import type { IntentProfile } from './intent-profile';
import type { IntentQualifier } from './intent-qualifier';
import {
  isLowConfidence,
  outOfScopeProfile,
  profileOrOutOfScope,
} from './intent-fallback';
import type { IntentTurnLog } from './intent-turn-log';
import { executeQualifyStep } from './qualify-step';
import { fewShotLinesForIntent } from '../../domain/leaf-retrieval-few-shot';
import type { QualifyResult, ShopIntent, ShopToolId } from './schema';

export const EVA_TURN_BASE_INSTRUCTIONS =
  'Język: polski. Cena i fakt tylko z narzędzi Nest. Bez SQL. Bez kwoty spoza quote-price. Bez faktu spoza lookup-leaf.';

export type PreparedTurn = {
  intent: ShopIntent;
  profile: IntentProfile;
  toolIds: ShopToolId[];
  instructions: string;
};

export function assembleTurnInstructions(profile: IntentProfile): string {
  const fewShot = fewShotLinesForIntent(profile.id);
  const parts = [
    EVA_TURN_BASE_INSTRUCTIONS,
    profile.context,
    profile.instructions,
    fewShot.length > 0
      ? `Przykłady slugów z pytań klientów:\n${fewShot.join('\n')}`
      : undefined,
  ];
  return parts.filter((part): part is string => Boolean(part?.trim())).join('\n\n');
}

function assembledTurn(profile: IntentProfile): PreparedTurn {
  return {
    intent: profile.id,
    profile,
    toolIds: [...profile.tools],
    instructions: assembleTurnInstructions(profile),
  };
}

async function qualifyOrOutOfScope(
  qualifier: IntentQualifier,
  message: string,
): Promise<QualifyResult | 'out_of_scope'> {
  try {
    return await executeQualifyStep(qualifier, { message });
  } catch {
    return 'out_of_scope';
  }
}

export type PrepareIntentTurnOptions = {
  currentIntent?: ShopIntent;
  sessionId?: string;
  log?: (entry: IntentTurnLog) => void;
};

function emitTurnLog(
  options: PrepareIntentTurnOptions | undefined,
  turn: PreparedTurn,
  extra: Pick<IntentTurnLog, 'candidateIntent' | 'forcedOutOfScope'>,
): PreparedTurn {
  options?.log?.({
    sessionId: options.sessionId,
    currentIntent: options.currentIntent,
    candidateIntent: extra.candidateIntent,
    acceptedIntent: turn.intent,
    tools: turn.toolIds,
    forcedOutOfScope: extra.forcedOutOfScope,
  });
  return turn;
}

export async function prepareIntentTurn(
  qualifier: IntentQualifier,
  message: string,
  options?: PrepareIntentTurnOptions,
): Promise<PreparedTurn> {
  let result = await qualifyOrOutOfScope(qualifier, message);
  if (result === 'out_of_scope') {
    return emitTurnLog(options, assembledTurn(outOfScopeProfile()), {
      forcedOutOfScope: true,
    });
  }

  if (isLowConfidence(result)) {
    result = await qualifyOrOutOfScope(qualifier, message);
    if (result === 'out_of_scope' || isLowConfidence(result)) {
      return emitTurnLog(options, assembledTurn(outOfScopeProfile()), {
        candidateIntent: result === 'out_of_scope' ? undefined : result.intent,
        forcedOutOfScope: true,
      });
    }
  }

  const accepted = acceptIntentTransition(
    options?.currentIntent,
    result.intent,
  );
  return emitTurnLog(
    options,
    assembledTurn(profileOrOutOfScope(accepted)),
    {
      candidateIntent: result.intent,
      forcedOutOfScope: false,
    },
  );
}
