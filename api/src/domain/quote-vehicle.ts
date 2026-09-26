import type { RouterEntities } from './sub-intent-catalog';

export const QUOTE_VEHICLE_WORKFLOW = 'quote_vehicle';

export type QuoteWorkflowSnapshot = {
  workflow: typeof QUOTE_VEHICLE_WORKFLOW;
  step: 'waiting_for_vehicle';
  entities: RouterEntities;
};

export type VehicleSlotKey = 'car_brand' | 'car_model' | 'year' | 'body_type';

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

const SLOT_ORDER: readonly VehicleSlotKey[] = [
  'car_brand',
  'car_model',
  'year',
  'body_type',
];

const BODY_ALIASES = ['hatchback', 'hatch', 'kombi', 'wagon', 'sedan', 'limuzyna', 'liftback', 'suv', 'coupe', 'cabrio', 'van'] as const;

function filled(entities: RouterEntities): RouterEntities {
  const next: RouterEntities = {};
  if (entities.car_brand?.trim()) {
    next.car_brand = entities.car_brand.trim();
  }
  if (entities.car_model?.trim()) {
    next.car_model = entities.car_model.trim();
  }
  if (typeof entities.year === 'number') {
    next.year = entities.year;
  }
  if (entities.body_type?.trim()) {
    next.body_type = entities.body_type.trim();
  }
  return next;
}

export function readYear(text: string): number | undefined {
  const match = text.match(/\b(19[89]\d|20[0-3]\d)\b/);
  if (!match?.[1]) {
    return undefined;
  }
  return Number(match[1]);
}

export function readBodyType(text: string): string | undefined {
  const normalized = text.trim().toLowerCase().replace(/\s+/g, ' ');
  if (normalized.length === 0) {
    return undefined;
  }
  const exact = BODY_ALIASES.find((alias) => alias === normalized);
  if (exact) {
    return exact;
  }
  const inside = BODY_ALIASES.find((alias) =>
    new RegExp(`\\b${alias}\\b`, 'iu').test(normalized),
  );
  if (inside) {
    return inside;
  }
  const closest = BODY_ALIASES.map((alias) => ({
    alias,
    distance: levenshtein(normalized, alias),
  })).sort(
    (left, right) =>
      left.distance - right.distance || left.alias.localeCompare(right.alias),
  );
  const best = closest[0];
  const next = closest[1];
  if (!best || best.distance > 2) {
    return undefined;
  }
  if (next && next.distance === best.distance) {
    return undefined;
  }
  return best.alias;
}

function applyReply(entities: RouterEntities, missing: VehicleSlotKey, message: string): void {
  if (missing === 'year') {
    const year = readYear(message);
    if (year !== undefined) {
      entities.year = year;
    }
    return;
  }
  if (missing === 'body_type') {
    const body = readBodyType(message);
    if (body !== undefined) {
      entities.body_type = body;
    }
    return;
  }
  entities[missing] = message.trim();
}

function harvest(entities: RouterEntities, message: string): void {
  if (entities.year === undefined) {
    const year = readYear(message);
    if (year !== undefined) {
      entities.year = year;
    }
  }
  if (entities.body_type === undefined) {
    const body = readBodyType(message);
    if (body !== undefined) {
      entities.body_type = body;
    }
  }
}

export function advanceVehicleSlots(input: {
  slots: RouterEntities;
  message?: string;
}): { slots: RouterEntities; missing?: VehicleSlotKey } {
  const slots = filled(input.slots);
  if (input.message !== undefined) {
    if (isSlotReply(input.message)) {
      const missing = firstMissing(slots);
      if (missing !== undefined) {
        applyReply(slots, missing, input.message);
      }
    } else {
      harvest(slots, input.message);
    }
  }
  return { slots, missing: firstMissing(slots) };
}

function firstMissing(entities: RouterEntities): VehicleSlotKey | undefined {
  return SLOT_ORDER.find((key) => !slotPresent(entities, key));
}

function slotPresent(entities: RouterEntities, key: VehicleSlotKey): boolean {
  if (key === 'year') {
    return typeof entities.year === 'number';
  }
  const value = entities[key];
  return typeof value === 'string' && value.trim() !== '';
}

function levenshtein(left: string, right: string): number {
  if (left === right) {
    return 0;
  }
  let row = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= right.length; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      current[j] = Math.min(current[j - 1] + 1, row[j] + 1, row[j - 1] + cost);
    }
    row = current;
  }
  return row[right.length] ?? left.length;
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
  const collected = advanceVehicleSlots({
    slots: input.entities,
    message: input.message,
  });
  const entities = collected.slots;
  const missing = collected.missing;
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
