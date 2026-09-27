import {
  SessionClient,
  type CascadeStatus,
  type SessionClientData,
} from '../domain/session-client';
import type { VehicleSlotKey } from '../domain/quote-vehicle';
import type { DataStore } from '../supabase/data-store';

export const SESSION_CLIENTS = Symbol('SESSION_CLIENTS');

export interface SessionClients {
  get(sessionId: string): Promise<SessionClient | undefined>;
  save(client: SessionClient): Promise<void>;
}

type SessionClientRow = {
  session_id: string;
  given_name: string | null;
  family_name: string | null;
  phone: string | null;
  email: string | null;
  contact_consent: boolean;
  consent_at: string | null;
  car_brand: string | null;
  car_model: string | null;
  year: number | null;
  body_type: string | null;
  missing_slot: string | null;
  cascade_status: string | null;
  brand_key: string | null;
  model_key: string | null;
  body_type_key: string | null;
  template_record_key: string | null;
  quote_variant: string | null;
  mat_type: string | null;
  updated_at?: string;
};

export class InMemorySessionClients implements SessionClients {
  private readonly rows = new Map<string, SessionClient>();

  async get(sessionId: string): Promise<SessionClient | undefined> {
    return this.rows.get(sessionId);
  }

  async save(client: SessionClient): Promise<void> {
    this.rows.set(client.data.sessionId, client);
  }
}

export class SupabaseSessionClients implements SessionClients {
  constructor(private readonly store: DataStore) {}

  async get(sessionId: string): Promise<SessionClient | undefined> {
    const rows = await this.store.selectEq<SessionClientRow>(
      'eva_bot',
      'session_clients',
      'session_id',
      sessionId,
    );
    const row = rows[0];
    return row ? clientFromRow(row) : undefined;
  }

  async save(client: SessionClient): Promise<void> {
    await this.store.upsert(
      'eva_bot',
      'session_clients',
      rowFromClient(client),
      'session_id',
    );
  }
}

function text(value: string | null): string | undefined {
  return value ?? undefined;
}

function clientFromRow(row: SessionClientRow): SessionClient {
  const data: SessionClientData = {
    sessionId: row.session_id,
    givenName: text(row.given_name),
    familyName: text(row.family_name),
    phone: text(row.phone),
    email: text(row.email),
    contactConsent: row.contact_consent,
    consentAt: text(row.consent_at),
    carBrand: text(row.car_brand),
    carModel: text(row.car_model),
    year: row.year ?? undefined,
    bodyType: text(row.body_type),
    missingSlot: (row.missing_slot as VehicleSlotKey | null) ?? undefined,
    cascadeStatus: (row.cascade_status as CascadeStatus | null) ?? undefined,
    brandKey: text(row.brand_key),
    modelKey: text(row.model_key),
    bodyTypeKey: text(row.body_type_key),
    templateRecordKey: text(row.template_record_key),
    quoteVariant: text(row.quote_variant),
    matType: text(row.mat_type),
  };
  return new SessionClient(data);
}

function rowFromClient(client: SessionClient): Record<string, unknown> {
  const data = client.data;
  return {
    session_id: data.sessionId,
    given_name: data.givenName ?? null,
    family_name: data.familyName ?? null,
    phone: data.phone ?? null,
    email: data.email ?? null,
    contact_consent: data.contactConsent,
    consent_at: data.consentAt ?? null,
    car_brand: data.carBrand ?? null,
    car_model: data.carModel ?? null,
    year: data.year ?? null,
    body_type: data.bodyType ?? null,
    missing_slot: data.missingSlot ?? null,
    cascade_status: data.cascadeStatus ?? null,
    brand_key: data.brandKey ?? null,
    model_key: data.modelKey ?? null,
    body_type_key: data.bodyTypeKey ?? null,
    template_record_key: data.templateRecordKey ?? null,
    quote_variant: data.quoteVariant ?? null,
    mat_type: data.matType ?? null,
    updated_at: new Date().toISOString(),
  };
}
