import type {
  BrandClassificationInput,
  ModelClassificationInput,
  VehicleKeyClassifier,
} from '../../domain/template-cascade';
import {
  createBrandKeyClassifierAgent,
  createModelKeyClassifierAgent,
} from './create-vehicle-key-classifier-agents';
import {
  brandClassificationMessage,
  modelClassificationMessage,
} from './classify-vehicle-key-prompts';
import {
  brandClassificationSchema,
  modelClassificationSchema,
} from './schema';

type StructuredGenerate<TSchema> = {
  generate: (
    message: string,
    options: {
      structuredOutput: {
        schema: TSchema;
        errorStrategy: 'strict';
      };
    },
  ) => Promise<{ object?: unknown }>;
};

export class MastraVehicleKeyClassifier implements VehicleKeyClassifier {
  constructor(
    private readonly brandAgent: StructuredGenerate<typeof brandClassificationSchema>,
    private readonly modelAgent: StructuredGenerate<typeof modelClassificationSchema>,
  ) {}

  async classifyBrand(input: BrandClassificationInput): Promise<string | null> {
    const result = await this.brandAgent.generate(
      brandClassificationMessage(input.customerBrand, input.brandKeys),
      {
        structuredOutput: {
          schema: brandClassificationSchema,
          errorStrategy: 'strict',
        },
      },
    );
    return brandClassificationSchema.parse(result.object).brandKey;
  }

  async classifyModel(input: ModelClassificationInput): Promise<string[]> {
    const result = await this.modelAgent.generate(
      modelClassificationMessage(input.customerModel, input.modelKeys),
      {
        structuredOutput: {
          schema: modelClassificationSchema,
          errorStrategy: 'strict',
        },
      },
    );
    return modelClassificationSchema.parse(result.object).modelKeys;
  }
}

export function vehicleKeyClassifierFromEnv(): MastraVehicleKeyClassifier | null {
  if (!process.env.DEEPSEEK_API_KEY?.trim()) {
    return null;
  }
  return new MastraVehicleKeyClassifier(
    createBrandKeyClassifierAgent(),
    createModelKeyClassifierAgent(),
  );
}
