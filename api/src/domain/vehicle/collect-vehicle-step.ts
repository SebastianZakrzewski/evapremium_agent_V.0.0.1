import type { RouterEntities } from '../sub-intent-catalog';
import { advanceQuoteVehicle } from './advance-vehicle-slots';
import type { VehicleSlotKey } from './types';

export function collectVehicleStep(input: {
  entities: RouterEntities;
  message?: string;
}):
  | {
      action: 'suspend';
      payload: {
        step: 'waiting_for_vehicle';
        missing: VehicleSlotKey;
        entities: RouterEntities;
      };
    }
  | {
      action: 'complete';
      output: {
        status: 'ready';
        tool: 'quote-vehicle';
        entities: RouterEntities;
      };
    } {
  const advanced = advanceQuoteVehicle(input);
  if (advanced.status === 'suspended') {
    return {
      action: 'suspend',
      payload: {
        step: advanced.snapshot.step,
        missing: advanced.missing,
        entities: advanced.snapshot.entities,
      },
    };
  }
  return {
    action: 'complete',
    output: {
      status: 'ready',
      tool: advanced.tool,
      entities: advanced.entities,
    },
  };
}

