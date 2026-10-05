import type { RouterEntities } from '../sub-intent-catalog';

/**
 * Sloty auta z wypowiedzi klienta: marka, model, rocznik, nadwozie, generacja.
 * Regułą zbierania jest `advanceVehicleSlots` i `advanceQuoteVehicle`.
 * `collectVehicleStep` tylko tłumaczy wynik na suspend/complete workflow Mastry.
 */

export const QUOTE_VEHICLE_WORKFLOW = 'quote_vehicle';

export type QuoteWorkflowSnapshot = {
  workflow: typeof QUOTE_VEHICLE_WORKFLOW;
  step: 'waiting_for_vehicle';
  entities: RouterEntities;
};

export type VehicleSlotKey = 'car_brand' | 'car_model' | 'year' | 'body_type' | 'generation';

export type QuoteVehicleAdvance =
  | {
      status: 'suspended';
      missing: VehicleSlotKey;
      snapshot: QuoteWorkflowSnapshot;
    }
  | {
      status: 'ready';
      entities: RouterEntities;
      tool: 'quote-vehicle';
    };
