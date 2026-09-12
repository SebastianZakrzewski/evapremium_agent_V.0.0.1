import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import type { IntentQualifier } from './intent-qualifier';
import { executeQualifyStep } from './qualify-step';
import { qualifyResultSchema } from './schema';

const workflowInputSchema = z.object({
  message: z.string().min(1),
});

export function createIntentWorkflow(qualifier: IntentQualifier) {
  const qualifyStep = createStep({
    id: 'qualify',
    description: 'Classify user message into ShopIntent. No shop tools.',
    inputSchema: workflowInputSchema,
    outputSchema: qualifyResultSchema,
    execute: async ({ inputData }) => executeQualifyStep(qualifier, inputData),
  });

  return createWorkflow({
    id: 'eva-intent-workflow',
    inputSchema: workflowInputSchema,
    outputSchema: qualifyResultSchema,
  })
    .then(qualifyStep)
    .commit();
}
