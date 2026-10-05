import { Agent } from '@mastra/core/agent';
import { DEEPSEEK_MASTRA_MODEL } from '../create-eva-mastra-agent';
import { VEHICLE_KEY_CLASSIFIER_INSTRUCTIONS } from './classify-vehicle-key-prompts';
import { VEHICLE_KEY_CLASSIFIER_TOOLS } from './schema';

export function createVehicleKeyClassifierAgent(): Agent {
  return new Agent({
    id: 'eva-vehicle-key-classifier',
    name: 'EVA vehicle key classifier',
    instructions: VEHICLE_KEY_CLASSIFIER_INSTRUCTIONS,
    model: DEEPSEEK_MASTRA_MODEL,
    tools: VEHICLE_KEY_CLASSIFIER_TOOLS,
  });
}
