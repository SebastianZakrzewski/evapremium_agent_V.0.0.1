import type { RouterEntities } from './sub-intent-catalog';
import type { VehicleSlotAlias } from './template-cascade';

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
  if (entities.generation?.trim()) {
    next.generation = entities.generation.trim();
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

export function readBodyType(
  text: string,
  aliases?: VehicleSlotAlias[],
): string | undefined {
  return matchBodyType(text, aliases)?.alias;
}

export function readVehicleReply(
  message: string,
  aliases?: VehicleSlotAlias[],
): { year?: number; body?: string; rest: string } {
  const year = readYear(message);
  const body = matchBodyType(message, aliases);
  let rest = message;
  if (body) {
    rest = rest.replace(
      new RegExp(`\\b${escapeRegExp(body.token)}\\b`, 'iu'),
      ' ',
    );
  }
  if (year !== undefined) {
    rest = rest.replace(new RegExp(`\\b${year}\\b`, 'u'), ' ');
  }
  rest = rest.replace(/\b(rok|rocznik)\b/giu, ' ');
  return {
    year,
    body: body?.alias,
    rest: rest.replace(/\s+/g, ' ').trim(),
  };
}

function bodyForms(
  aliases: VehicleSlotAlias[] | undefined,
): { alias: string; label: string }[] {
  const forms: { alias: string; label: string }[] = [];
  const seen = new Set<string>();
  for (const row of aliases ?? []) {
    if (row.slotKind !== 'body_type') {
      continue;
    }
    const label = row.aliasNormalized.trim().toLowerCase();
    if (label.length === 0 || seen.has(label)) {
      continue;
    }
    seen.add(label);
    forms.push({ alias: label, label });
  }
  for (const alias of BODY_ALIASES) {
    if (seen.has(alias)) {
      continue;
    }
    seen.add(alias);
    forms.push({ alias, label: alias });
  }
  return forms;
}

function matchBodyType(
  text: string,
  aliases?: VehicleSlotAlias[],
): { alias: string; token: string } | undefined {
  const normalized = text.trim().toLowerCase().replace(/\s+/g, ' ');
  if (normalized.length === 0) {
    return undefined;
  }
  const forms = bodyForms(aliases);
  const exact = forms.find((form) => form.label === normalized);
  if (exact) {
    return { alias: exact.alias, token: exact.label };
  }
  const inside = forms
    .filter((form) => new RegExp(`\\b${escapeRegExp(form.label)}\\b`, 'iu').test(normalized))
    .sort((left, right) => right.label.length - left.label.length)[0];
  if (inside) {
    return { alias: inside.alias, token: inside.label };
  }
  const tokens = normalized.split(' ').filter((token) => token.length > 0);
  let best: { alias: string; token: string; distance: number } | undefined;
  let tied = false;
  for (const token of tokens) {
    if (token.length < 4) {
      continue;
    }
    for (const form of forms) {
      if (Math.abs(token.length - form.label.length) > 2) {
        continue;
      }
      const distance = levenshtein(token, form.label);
      if (distance === 0 || distance > 2) {
        continue;
      }
      if (!best || distance < best.distance) {
        best = { alias: form.alias, token, distance };
        tied = false;
      } else if (distance === best.distance && form.alias !== best.alias) {
        tied = true;
      }
    }
  }
  if (!best || tied) {
    return undefined;
  }
  return { alias: best.alias, token: best.token };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function applyReply(
  entities: RouterEntities,
  missing: VehicleSlotKey,
  message: string,
  aliases?: VehicleSlotAlias[],
): void {
  const parsed = readVehicleReply(message, aliases);
  if (missing === 'year') {
    if (parsed.year !== undefined) {
      entities.year = parsed.year;
    }
    if (parsed.body !== undefined && entities.body_type === undefined) {
      entities.body_type = parsed.body;
    }
    return;
  }
  if (missing === 'body_type') {
    if (parsed.body !== undefined) {
      entities.body_type = parsed.body;
    }
    if (parsed.year !== undefined && entities.year === undefined) {
      entities.year = parsed.year;
    }
    return;
  }
  if (parsed.year !== undefined && entities.year === undefined) {
    entities.year = parsed.year;
  }
  if (parsed.body !== undefined && entities.body_type === undefined) {
    entities.body_type = parsed.body;
  }
  if (parsed.rest) {
    entities[missing] = parsed.rest;
    return;
  }
  if (parsed.year === undefined && parsed.body === undefined) {
    entities[missing] = message.trim();
  }
}

function harvest(
  entities: RouterEntities,
  message: string,
  aliases?: VehicleSlotAlias[],
): void {
  const parsed = readVehicleReply(message, aliases);
  if (entities.year === undefined && parsed.year !== undefined) {
    entities.year = parsed.year;
  }
  if (entities.body_type === undefined && parsed.body !== undefined) {
    entities.body_type = parsed.body;
  }
}

export function advanceVehicleSlots(input: {
  slots: RouterEntities;
  message?: string;
  aliases?: VehicleSlotAlias[];
  asked?: VehicleSlotKey;
  /** First-turn text must not be copied into an empty brand or model slot. */
  fillMissingFromMessage?: boolean;
}): { slots: RouterEntities; missing?: VehicleSlotKey } {
  const slots = filled(input.slots);
  if (input.message !== undefined) {
    const fillMissing = input.fillMissingFromMessage !== false;
    if (fillMissing && isSlotReply(input.message)) {
      const missing = input.asked ?? firstMissing(slots);
      if (missing !== undefined) {
        applyReply(slots, missing, input.message, input.aliases);
      }
    } else {
      harvest(slots, input.message, input.aliases);
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
