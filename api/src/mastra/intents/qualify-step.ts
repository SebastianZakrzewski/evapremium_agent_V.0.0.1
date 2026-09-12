import type { IntentQualifier } from './intent-qualifier';
import type { QualifyResult } from './schema';

export async function executeQualifyStep(
  qualifier: IntentQualifier,
  input: { message: string },
): Promise<QualifyResult> {
  return qualifier.qualify(input.message);
}
