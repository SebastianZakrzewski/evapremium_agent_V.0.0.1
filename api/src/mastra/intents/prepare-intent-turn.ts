import { acceptIntentTransition } from './accept-intent-transition';
import type { IntentProfile } from './intent-profile';
import type { IntentQualifier } from './intent-qualifier';
import {
  isLowConfidence,
  outOfScopeProfile,
  profileOrOutOfScope,
} from './intent-fallback';
import { executeQualifyStep } from './qualify-step';
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
  return [
    EVA_TURN_BASE_INSTRUCTIONS,
    profile.context,
    profile.instructions,
  ]
    .filter((part): part is string => Boolean(part?.trim()))
    .join('\n\n');
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

export async function prepareIntentTurn(
  qualifier: IntentQualifier,
  message: string,
  options?: { currentIntent?: ShopIntent },
): Promise<PreparedTurn> {
  let result = await qualifyOrOutOfScope(qualifier, message);
  if (result === 'out_of_scope') {
    return assembledTurn(outOfScopeProfile());
  }

  if (isLowConfidence(result)) {
    result = await qualifyOrOutOfScope(qualifier, message);
    if (result === 'out_of_scope' || isLowConfidence(result)) {
      return assembledTurn(outOfScopeProfile());
    }
  }

  const accepted = acceptIntentTransition(
    options?.currentIntent,
    result.intent,
  );
  return assembledTurn(profileOrOutOfScope(accepted));
}
