import type { RouterEntities } from '../sub-intent-catalog';
import type { VehicleSlotAlias } from '../template-cascade';
import { applyReply, harvest, splitGluedBrand } from './parse-utterance';
import {
  QUOTE_VEHICLE_WORKFLOW,
  type QuoteVehicleAdvance,
  type VehicleSlotKey,
} from './types';

const SLOT_ORDER: readonly VehicleSlotKey[] = [
  'car_brand',
  'car_model',
  'year',
  'body_type',
];

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

/**
 * Dopisuje sloty z wiadomości. Przy odpowiedzi na pytanie (`isSlotReply`)
 * reszta tekstu trafia w brakujący slot. Pierwsza wypowiedź oferty
 * (`fillMissingFromMessage: false`) nie staje się marką ani modelem.
 */
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
    splitGluedBrand(slots, input.message, input.aliases);
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

/** Zawiesza workflow, dopóki brakuje marki, modelu, roku albo nadwozia. */
export function advanceQuoteVehicle(input: {
  entities: RouterEntities;
  message?: string;
  aliases?: VehicleSlotAlias[];
}): QuoteVehicleAdvance {
  const collected = advanceVehicleSlots({
    slots: input.entities,
    message: input.message,
    aliases: input.aliases,
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
