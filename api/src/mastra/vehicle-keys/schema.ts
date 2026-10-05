import { z } from 'zod';

export const brandClassificationSchema = z.object({
  brandKey: z.string().nullable(),
});

export const modelClassificationSchema = z.object({
  modelKeys: z.array(z.string()),
});

export const bodyClassificationSchema = z.object({
  bodyTypeKey: z.string().nullable(),
});

export const generationClassificationSchema = z.object({
  generationKey: z.string().nullable(),
});

export const VEHICLE_KEY_CLASSIFIER_TOOLS: Record<string, never> = {};
