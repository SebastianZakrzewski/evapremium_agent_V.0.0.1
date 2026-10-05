import type {
  BodyClassificationInput,
  BrandClassificationInput,
  GenerationClassificationInput,
  ModelClassificationInput,
  VehicleKeyClassifier,
} from '../../domain/template-cascade';
import {
  createBodyKeyClassifierAgent,
  createBrandKeyClassifierAgent,
  createGenerationKeyClassifierAgent,
  createModelKeyClassifierAgent,
} from './create-vehicle-key-classifier-agents';
import {
  bodyClassificationMessage,
  brandClassificationMessage,
  generationClassificationMessage,
  modelClassificationMessage,
} from './classify-vehicle-key-prompts';
import {
  bodyClassificationSchema,
  brandClassificationSchema,
  generationClassificationSchema,
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
    private readonly bodyAgent: StructuredGenerate<typeof bodyClassificationSchema>,
    private readonly generationAgent: StructuredGenerate<typeof generationClassificationSchema>,
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
      modelClassificationMessage(input.customerModel, input.modelKeys, input.year),
      {
        structuredOutput: {
          schema: modelClassificationSchema,
          errorStrategy: 'strict',
        },
      },
    );
    return modelClassificationSchema.parse(result.object).modelKeys;
  }

  async classifyBody(input: BodyClassificationInput): Promise<string | null> {
    const result = await this.bodyAgent.generate(
      bodyClassificationMessage(input.customerBody, input.bodyKeys),
      {
        structuredOutput: {
          schema: bodyClassificationSchema,
          errorStrategy: 'strict',
        },
      },
    );
    return bodyClassificationSchema.parse(result.object).bodyTypeKey;
  }

  async classifyGeneration(input: GenerationClassificationInput): Promise<string | null> {
    const result = await this.generationAgent.generate(
      generationClassificationMessage(input.customerGeneration, input.generationKeys),
      {
        structuredOutput: {
          schema: generationClassificationSchema,
          errorStrategy: 'strict',
        },
      },
    );
    return generationClassificationSchema.parse(result.object).generationKey;
  }
}

export function vehicleKeyClassifierFromEnv(): MastraVehicleKeyClassifier | null {
  if (!process.env.DEEPSEEK_API_KEY?.trim()) {
    return null;
  }
  return new MastraVehicleKeyClassifier(
    createBrandKeyClassifierAgent(),
    createModelKeyClassifierAgent(),
    createBodyKeyClassifierAgent(),
    createGenerationKeyClassifierAgent(),
  );
}
