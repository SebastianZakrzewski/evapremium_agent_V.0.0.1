import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import {
  advanceFitmentCascade,
  FITMENT_CASCADE_WORKFLOW,
  type FitmentCascadePort,
} from '../../domain/fitment-session';

const slotsSchema = z.object({
  car_brand: z.string().optional(),
  car_model: z.string().optional(),
  year: z.number().optional(),
  body_type: z.string().optional(),
  generation: z.string().optional(),
});

const cascadeInputSchema = z.object({
  slots: slotsSchema,
});

const suspendSchema = z.object({
  workflow: z.literal(FITMENT_CASCADE_WORKFLOW),
  step: z.literal('waiting_for_vehicle'),
  missing: z.enum(['car_brand', 'car_model', 'year', 'body_type', 'generation']),
  slots: slotsSchema,
  options: z.array(z.string()).optional(),
});

const resumeSchema = z.object({
  message: z.string(),
});

const readySchema = z.object({
  status: z.literal('ready'),
  match: z.enum(['none', 'one', 'many']),
  recordKey: z.string().optional(),
});

export function createFitmentCascadeWorkflow(cascade: FitmentCascadePort) {
  const step = createStep({
    id: 'resolve-cascade',
    description:
      'Zbiera markę, model, rok i typ nadwozia. Generację dopytuje tylko, gdy rocznik wpada w więcej niż jeden zakres.',
    inputSchema: cascadeInputSchema,
    outputSchema: readySchema,
    resumeSchema,
    suspendSchema,
    execute: async ({ inputData, resumeData, suspend }) => {
      const decision = await advanceFitmentCascade({
        slots: inputData.slots,
        message: resumeData?.message,
        resolve: (input) => cascade.resolve(input),
        aliases: cascade.listAliases(),
      });
      if (decision.status === 'suspended') {
        return suspend(decision.snapshot);
      }
      return {
        status: 'ready' as const,
        match: decision.result.status,
        recordKey:
          decision.result.status === 'one'
            ? decision.result.template.recordKey
            : undefined,
      };
    },
  });

  return createWorkflow({
    id: 'fitment-cascade',
    inputSchema: cascadeInputSchema,
    outputSchema: readySchema,
  })
    .then(step)
    .commit();
}
