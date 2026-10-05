import type { ZodType } from 'zod';
import type {
  BodyClassificationInput,
  BrandClassificationInput,
  GenerationClassificationInput,
  ModelClassificationInput,
  VehicleKeyClassifier,
} from '../../domain/template-cascade';
import { createVehicleKeyClassifierAgent } from './create-vehicle-key-classifier-agents';
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

type StructuredGenerate = {
  generate: (
    message: string,
    options: {
      structuredOutput: {
        schema: ZodType;
        errorStrategy: 'strict';
      };
    },
  ) => Promise<{ object?: unknown }>;
};

export class MastraVehicleKeyClassifier implements VehicleKeyClassifier {
  constructor(private readonly agent: StructuredGenerate) {}

  async classifyBrand(input: BrandClassificationInput): Promise<string | null> {
    const result = await this.agent.generate(
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
    const result = await this.agent.generate(
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
    const result = await this.agent.generate(
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
    const result = await this.agent.generate(
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
  return new MastraVehicleKeyClassifier(createVehicleKeyClassifierAgent());
}
