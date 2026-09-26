import {
  advanceVehicleSlots,
  type VehicleSlotKey,
} from './quote-vehicle';
import type { RouterEntities } from './sub-intent-catalog';
import type {
  TemplateCascadeInput,
  TemplateCascadeResult,
  VehicleSlotAlias,
} from './template-cascade';

export const FITMENT_CASCADE_WORKFLOW = 'fitment_cascade';

export type FitmentSnapshot = {
  workflow: typeof FITMENT_CASCADE_WORKFLOW;
  step: 'waiting_for_vehicle';
  missing: VehicleSlotKey;
  slots: RouterEntities;
};

export type FitmentCascadePort = {
  resolve(input: TemplateCascadeInput): Promise<TemplateCascadeResult>;
  listAliases(): VehicleSlotAlias[];
};

export type FitmentCascadeAdvance =
  | { status: 'suspended'; snapshot: FitmentSnapshot }
  | { status: 'ready'; result: TemplateCascadeResult };

export type FitmentMemory = {
  getFitment(sessionId: string): FitmentSnapshot | undefined;
  setFitment(sessionId: string, snapshot: FitmentSnapshot | undefined): void;
};

export async function advanceFitmentCascade(input: {
  slots: RouterEntities;
  message?: string;
  resolve: FitmentCascadePort['resolve'];
}): Promise<FitmentCascadeAdvance> {
  const collected = advanceVehicleSlots({
    slots: input.slots,
    message: input.message,
  });
  if (collected.missing !== undefined) {
    return {
      status: 'suspended',
      snapshot: {
        workflow: FITMENT_CASCADE_WORKFLOW,
        step: 'waiting_for_vehicle',
        missing: collected.missing,
        slots: collected.slots,
      },
    };
  }
  const result = await input.resolve({
    brand: collected.slots.car_brand,
    model: collected.slots.car_model,
    year: collected.slots.year,
    bodyType: collected.slots.body_type,
  });
  return { status: 'ready', result };
}
