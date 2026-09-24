import type { RouterEntities } from './sub-intent-catalog';

export const QUOTE_VEHICLE_WORKFLOW = 'quote_vehicle';

export type QuoteWorkflowSnapshot = {
  workflow: typeof QUOTE_VEHICLE_WORKFLOW;
  step: 'waiting_for_vehicle';
  entities: RouterEntities;
};

export type QuoteVehicleAdvance =
  | {
      status: 'suspended';
      missing: 'car_brand' | 'car_model';
      snapshot: QuoteWorkflowSnapshot;
    }
  | {
      status: 'ready';
      entities: RouterEntities;
      tool: 'quote-vehicle';
    };

const SLOT_ORDER = ['car_brand', 'car_model'] as const;

function filled(entities: RouterEntities): RouterEntities {
  const next: RouterEntities = {};
  if (entities.car_brand?.trim()) {
    next.car_brand = entities.car_brand.trim();
  }
  if (entities.car_model?.trim()) {
    next.car_model = entities.car_model.trim();
  }
  return next;
}

function firstMissing(
  entities: RouterEntities,
): 'car_brand' | 'car_model' | undefined {
  return SLOT_ORDER.find((key) => entities[key] === undefined);
}

export function isSlotReply(message: string): boolean {
  const text = message.trim();
  if (text.length === 0 || text.length > 80) {
    return false;
  }
  if (text.includes('?')) {
    return false;
  }
  if (/^(jak|czy|ile|kiedy|gdzie|co)\b/iu.test(text)) {
    return false;
  }
  return true;
}

export function advanceQuoteVehicle(input: {
  entities: RouterEntities;
  message?: string;
}): QuoteVehicleAdvance {
  const entities = filled(input.entities);
  if (input.message !== undefined && isSlotReply(input.message)) {
    const missing = firstMissing(entities);
    if (missing !== undefined) {
      entities[missing] = input.message.trim();
    }
  }
  const missing = firstMissing(entities);
  if (missing !== undefined) {
    return {
      status: 'suspended',
      missing,
      snapshot: {
        workflow: QUOTE_VEHICLE_WORKFLOW,
        step: 'waiting_for_vehicle',
        entities,
      },
    };
  }
  return {
    status: 'ready',
    entities,
    tool: 'quote-vehicle',
  };
}

export function collectVehicleStep(input: {
  entities: RouterEntities;
  message?: string;
}):
  | {
      action: 'suspend';
      payload: {
        step: 'waiting_for_vehicle';
        missing: 'car_brand' | 'car_model';
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
