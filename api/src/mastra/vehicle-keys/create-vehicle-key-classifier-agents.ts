import { Agent } from '@mastra/core/agent';
import { DEEPSEEK_MASTRA_MODEL } from '../create-eva-mastra-agent';
import {
  BODY_KEY_CLASSIFIER_INSTRUCTIONS,
  BRAND_KEY_CLASSIFIER_INSTRUCTIONS,
  GENERATION_KEY_CLASSIFIER_INSTRUCTIONS,
  MODEL_KEY_CLASSIFIER_INSTRUCTIONS,
} from './classify-vehicle-key-prompts';
import { VEHICLE_KEY_CLASSIFIER_TOOLS } from './schema';

export function createBrandKeyClassifierAgent(): Agent {
  return new Agent({
    id: 'eva-brand-key-classifier',
    name: 'EVA brand key classifier',
    instructions: BRAND_KEY_CLASSIFIER_INSTRUCTIONS,
    model: DEEPSEEK_MASTRA_MODEL,
    tools: VEHICLE_KEY_CLASSIFIER_TOOLS,
  });
}

export function createBodyKeyClassifierAgent(): Agent {
  return new Agent({
    id: 'eva-body-key-classifier',
    name: 'EVA body key classifier',
    instructions: BODY_KEY_CLASSIFIER_INSTRUCTIONS,
    model: DEEPSEEK_MASTRA_MODEL,
    tools: VEHICLE_KEY_CLASSIFIER_TOOLS,
  });
}

export function createGenerationKeyClassifierAgent(): Agent {
  return new Agent({
    id: 'eva-generation-key-classifier',
    name: 'EVA generation key classifier',
    instructions: GENERATION_KEY_CLASSIFIER_INSTRUCTIONS,
    model: DEEPSEEK_MASTRA_MODEL,
    tools: VEHICLE_KEY_CLASSIFIER_TOOLS,
  });
}

export function createModelKeyClassifierAgent(): Agent {
  return new Agent({
    id: 'eva-model-key-classifier',
    name: 'EVA model key classifier',
    instructions: MODEL_KEY_CLASSIFIER_INSTRUCTIONS,
    model: DEEPSEEK_MASTRA_MODEL,
    tools: VEHICLE_KEY_CLASSIFIER_TOOLS,
  });
}
