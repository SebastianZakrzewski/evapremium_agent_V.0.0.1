import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { collectVehicleStep } from '../../domain/quote-vehicle';

const entitiesSchema = z.object({
  car_brand: z.string().optional(),
  car_model: z.string().optional(),
  year: z.number().optional(),
  body_type: z.string().optional(),
});

const vehicleInputSchema = z.object({
  entities: entitiesSchema,
});

const suspendSchema = z.object({
  step: z.literal('waiting_for_vehicle'),
  missing: z.enum(['car_brand', 'car_model', 'year', 'body_type']),
  entities: entitiesSchema,
});

const resumeSchema = z.object({
  message: z.string(),
});

const readySchema = z.object({
  status: z.literal('ready'),
  tool: z.literal('quote-vehicle'),
  entities: entitiesSchema,
});

export function createCollectVehicleStep() {
  return createStep({
    id: 'collect-vehicle',
    description:
      'Zbiera markę, model, rok i typ nadwozia. Brak pola wstrzymuje workflow.',
    inputSchema: vehicleInputSchema,
    outputSchema: readySchema,
    resumeSchema,
    suspendSchema,
    execute: async ({ inputData, resumeData, suspend }) => {
      const decision = collectVehicleStep({
        entities: inputData.entities,
        message: resumeData?.message,
      });
      if (decision.action === 'suspend') {
        return suspend(decision.payload);
      }
      return decision.output;
    },
  });
}

export function createQuoteVehicleWorkflow() {
  const step = createCollectVehicleStep();
  return createWorkflow({
    id: 'quote-vehicle',
    inputSchema: vehicleInputSchema,
    outputSchema: readySchema,
  })
    .then(step)
    .commit();
}
