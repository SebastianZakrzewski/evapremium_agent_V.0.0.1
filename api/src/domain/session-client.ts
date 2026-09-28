import type { FitmentSnapshot } from './fitment-session';
import type { RouterEntities } from './sub-intent-catalog';
import type { VehicleSlotKey } from './quote-vehicle';

export type CascadeStatus = 'suspended' | 'one' | 'many' | 'none';

export type SessionClientData = {
  sessionId: string;
  givenName?: string;
  familyName?: string;
  phone?: string;
  email?: string;
  contactConsent: boolean;
  consentAt?: string;
  carBrand?: string;
  carModel?: string;
  year?: number;
  bodyType?: string;
  missingSlot?: VehicleSlotKey;
  cascadeStatus?: CascadeStatus;
  brandKey?: string;
  modelKey?: string;
  bodyTypeKey?: string;
  templateRecordKey?: string;
  quoteVariant?: string;
  matType?: string;
};

export type ClientContextNeed = {
  vehicle: boolean;
  person: boolean;
  quote: boolean;
};

export type VehicleTurnMemory = {
  entities: RouterEntities;
  collectedSlots?: RouterEntities;
  fitment?: Pick<FitmentSnapshot, 'missing' | 'slots'>;
  quoteEntities?: RouterEntities;
  cascadeMatch?: CascadeStatus;
  verifiedProduct?: { productId: string; fields: Record<string, string> };
};

const NAME_PATTERN =
  /(?:nazywam się|mam na imię)\s+(\p{L}[\p{L}'-]+)(?:\s+(\p{L}[\p{L}'-]+))?/iu;
const EMAIL_PATTERN = /\b[^\s@]+@[^\s@]+\.[^\s@]+\b/u;
const PHONE_PATTERN = /(?:\+48[\s-]?)?(?:\d[\s-]?){8}\d/u;
const CONSENT_PATTERN =
  /(?:zgadzam się|wyrażam zgodę|wyrazam zgode)(?=$|[\s,.;!])/iu;

export class SessionClient {
  constructor(readonly data: SessionClientData) {}

  static empty(sessionId: string): SessionClient {
    return new SessionClient({ sessionId, contactConsent: false });
  }

  hasFacts(): boolean {
    const data = this.data;
    return Boolean(
      data.givenName ||
        data.familyName ||
        data.phone ||
        data.email ||
        data.contactConsent ||
        data.carBrand ||
        data.carModel ||
        typeof data.year === 'number' ||
        data.bodyType ||
        data.missingSlot ||
        data.cascadeStatus ||
        data.brandKey ||
        data.modelKey ||
        data.bodyTypeKey ||
        data.templateRecordKey ||
        data.quoteVariant ||
        data.matType,
    );
  }

  equals(other: SessionClient): boolean {
    return JSON.stringify(this.data) === JSON.stringify(other.data);
  }

  rememberUtterance(message: string, at: string): SessionClient {
    const next: SessionClientData = { ...this.data };
    const name = message.match(NAME_PATTERN);
    if (name?.[1]) {
      next.givenName = name[1];
      next.familyName = name[2];
    }
    const email = message.match(EMAIL_PATTERN);
    if (email?.[0]) {
      next.email = email[0];
    }
    const phone = message.match(PHONE_PATTERN);
    if (phone?.[0]) {
      next.phone = phone[0].replace(/\s+/g, '');
    }
    if (CONSENT_PATTERN.test(message) && !next.contactConsent) {
      next.contactConsent = true;
      next.consentAt = at;
    }
    return new SessionClient(next);
  }

  rememberVehicle(turn: VehicleTurnMemory): SessionClient {
    const slots =
      turn.collectedSlots ??
      turn.fitment?.slots ??
      turn.quoteEntities ??
      turn.entities;
    const next: SessionClientData = { ...this.data };
    const brandChanged = Boolean(
      slots.car_brand && next.carBrand && slots.car_brand !== next.carBrand,
    );
    const modelChanged = Boolean(
      slots.car_model && next.carModel && slots.car_model !== next.carModel,
    );
    if (brandChanged || modelChanged) {
      next.brandKey = undefined;
      next.modelKey = undefined;
      next.bodyTypeKey = undefined;
      next.templateRecordKey = undefined;
      next.quoteVariant = undefined;
      next.matType = undefined;
      next.cascadeStatus = undefined;
      next.missingSlot = undefined;
    }
    if (slots.car_brand) {
      next.carBrand = slots.car_brand;
    }
    if (slots.car_model) {
      next.carModel = slots.car_model;
    }
    if (typeof slots.year === 'number') {
      next.year = slots.year;
    }
    if (slots.body_type) {
      next.bodyType = slots.body_type;
    }
    if (turn.fitment) {
      next.missingSlot = turn.fitment.missing;
      next.cascadeStatus = 'suspended';
    } else if (turn.cascadeMatch) {
      next.missingSlot = undefined;
      next.cascadeStatus = turn.cascadeMatch;
    }
    if (turn.verifiedProduct) {
      const { fields } = turn.verifiedProduct;
      if (fields.brand_key) {
        next.brandKey = fields.brand_key;
      }
      if (fields.model_key) {
        next.modelKey = fields.model_key;
      }
      next.templateRecordKey = turn.verifiedProduct.productId;
    }
    return new SessionClient(next);
  }

  note(need: ClientContextNeed): string | undefined {
    const lines: string[] = [];
    if (need.person) {
      const person = personLine(this.data);
      if (person) {
        lines.push(person);
      }
    }
    if (need.vehicle) {
      const vehicle = vehicleLine(this.data);
      if (vehicle) {
        lines.push(vehicle);
      }
    }
    if (need.quote) {
      const quote = quoteLine(this.data);
      if (quote) {
        lines.push(quote);
      }
    }
    return lines.length > 0 ? lines.join(' ') : undefined;
  }
}

const FAQ_SUB_INTENTS = new Set([
  'available_colors',
  'material',
  'delivery_info',
  'complaint_info',
]);

export function contextNeedForTurn(turn: {
  intent?: string;
  subIntent: string | null;
  execution: { kind: string; workflow?: string };
}): ClientContextNeed {
  const workflow =
    turn.execution.kind === 'workflow' ? turn.execution.workflow : undefined;
  const explicit =
    turn.subIntent === 'fitment' ||
    turn.subIntent === 'indicative_quote' ||
    workflow === 'fitment_cascade' ||
    workflow === 'quote_vehicle';
  const continuation =
    turn.intent === 'product_info' &&
    turn.subIntent === null &&
    !FAQ_SUB_INTENTS.has(turn.subIntent ?? '');
  const vehicle = explicit || continuation;
  const quote =
    turn.subIntent === 'indicative_quote' || workflow === 'quote_vehicle';
  return { vehicle, quote, person: false };
}

export function shouldRememberQualifierEntities(turn: {
  subIntent: string | null;
  execution: { kind: string };
  fitment?: unknown;
  collectedSlots?: unknown;
  verifiedProduct?: unknown;
}): boolean {
  return (
    turn.subIntent === 'fitment' ||
    turn.subIntent === 'indicative_quote' ||
    turn.execution.kind === 'workflow' ||
    turn.fitment !== undefined ||
    turn.collectedSlots !== undefined ||
    turn.verifiedProduct !== undefined
  );
}

export function conflictsWithStoredVehicle(
  message: string,
  entities: RouterEntities,
  known: { carBrand?: string; carModel?: string },
): boolean {
  return (
    namesDifferentSlot(message, entities.car_brand, known.carBrand) ||
    namesDifferentSlot(message, entities.car_model, known.carModel)
  );
}

function namesDifferentSlot(
  message: string,
  incoming: string | undefined,
  stored: string | undefined,
): boolean {
  const next = incoming?.trim();
  const current = stored?.trim();
  if (!next || !current) {
    return false;
  }
  if (next.toLowerCase() === current.toLowerCase()) {
    return false;
  }
  if (next.toLowerCase() === message.trim().toLowerCase()) {
    return false;
  }
  return true;
}

function personLine(data: SessionClientData): string | undefined {
  const parts: string[] = [];
  if (data.givenName) {
    parts.push(`imię=${data.givenName}`);
  }
  if (data.familyName) {
    parts.push(`nazwisko=${data.familyName}`);
  }
  if (data.phone) {
    parts.push(`telefon=${data.phone}`);
  }
  if (data.email) {
    parts.push(`email=${data.email}`);
  }
  if (data.contactConsent) {
    parts.push('zgoda=tak');
  }
  return parts.length > 0 ? `Klient: ${parts.join(', ')}.` : undefined;
}

function vehicleLine(data: SessionClientData): string | undefined {
  const parts: string[] = [];
  if (data.carBrand) {
    parts.push(`marka=${data.carBrand}`);
  }
  if (data.carModel) {
    parts.push(`model=${data.carModel}`);
  }
  if (typeof data.year === 'number') {
    parts.push(`rocznik=${data.year}`);
  }
  if (data.bodyType) {
    parts.push(`nadwozie=${data.bodyType}`);
  }
  if (data.brandKey) {
    parts.push(`brand_key=${data.brandKey}`);
  }
  if (data.modelKey) {
    parts.push(`model_key=${data.modelKey}`);
  }
  if (data.templateRecordKey) {
    parts.push(`recordKey=${data.templateRecordKey}`);
  }
  if (parts.length === 0) {
    return undefined;
  }
  const missing = data.missingSlot ? ` Brakuje ${data.missingSlot}.` : '';
  return `Auto sesji: ${parts.join(', ')}.${missing}`;
}

function quoteLine(data: SessionClientData): string | undefined {
  const parts: string[] = [];
  if (data.quoteVariant) {
    parts.push(`wariant=${data.quoteVariant}`);
  }
  if (data.matType) {
    parts.push(`mata=${data.matType}`);
  }
  return parts.length > 0 ? `Wycena sesji: ${parts.join(', ')}.` : undefined;
}
