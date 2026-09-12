import type { IntentProfile } from './intent-profile';
import { intentProfileFor } from './profiles';
import type { QualifyResult } from './schema';

export const LOW_INTENT_CONFIDENCE = 0.5;

export function outOfScopeProfile(): IntentProfile {
  const profile = intentProfileFor('out_of_scope');
  if (profile === undefined) {
    throw new Error('out_of_scope IntentProfile is required');
  }
  return profile;
}

export function profileOrOutOfScope(intent: string): IntentProfile {
  return intentProfileFor(intent) ?? outOfScopeProfile();
}

export function isLowConfidence(result: QualifyResult): boolean {
  return result.confidence < LOW_INTENT_CONFIDENCE;
}
