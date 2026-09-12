import type { IntentQualifier } from './intent-qualifier';
import { qualifyResultSchema, type QualifyResult } from './schema';

export type QualifyGenerate = {
  generate: (
    message: string,
    options: {
      structuredOutput: {
        schema: typeof qualifyResultSchema;
        errorStrategy: 'strict';
      };
    },
  ) => Promise<{ object?: unknown }>;
};

export class MastraIntentQualifier implements IntentQualifier {
  constructor(private readonly agent: QualifyGenerate) {}

  async qualify(message: string): Promise<QualifyResult> {
    const result = await this.agent.generate(message, {
      structuredOutput: {
        schema: qualifyResultSchema,
        errorStrategy: 'strict',
      },
    });
    return qualifyResultSchema.parse(result.object);
  }
}
