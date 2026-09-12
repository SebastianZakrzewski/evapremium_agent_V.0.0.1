import type { QualifyResult } from './schema';

export interface IntentQualifier {
  qualify(message: string): Promise<QualifyResult>;
}
