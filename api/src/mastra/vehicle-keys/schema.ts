import { z } from 'zod';

export const brandClassificationSchema = z.object({
  brandKey: z.string().nullable(),
});

export const modelClassificationSchema = z.object({
  modelKeys: z.array(z.string()),
});

export const VEHICLE_KEY_CLASSIFIER_TOOLS: Record<string, never> = {};
