import {
  COLLECT_CONTACT_WORKFLOW,
  type ContactWorkflowSnapshot,
} from '../../domain/collect-contact';
import { FITMENT_CASCADE_WORKFLOW, type FitmentSnapshot } from '../../domain/fitment-session';
import { QUOTE_VEHICLE_WORKFLOW, type QuoteWorkflowSnapshot } from '../../domain/quote-vehicle';
import type { DataStore } from '../../supabase/data-store';
import {
  InMemoryIntentSessionState,
  type IntentSessionState,
} from './intent-session-state';
import { shopIntentSchema, type ShopIntent } from './schema';

type AgentStateRow = {
  session_id: string;
  intent: unknown;
  quote_workflow: unknown;
  fitment: unknown;
  contact_workflow: unknown;
};

export class SupabaseIntentSessionState implements IntentSessionState {
  private readonly memory = new InMemoryIntentSessionState();
  private readonly loaded = new Set<string>();

  constructor(private readonly store: DataStore) {}

  get(sessionId: string): ShopIntent | undefined {
    return this.memory.get(sessionId);
  }

  set(sessionId: string, intent: ShopIntent): void {
    this.memory.set(sessionId, intent);
  }

  getQuoteWorkflow(sessionId: string): QuoteWorkflowSnapshot | undefined {
    return this.memory.getQuoteWorkflow(sessionId);
  }

  setQuoteWorkflow(sessionId: string, snapshot: QuoteWorkflowSnapshot | undefined): void {
    this.memory.setQuoteWorkflow(sessionId, snapshot);
  }

  getFitment(sessionId: string): FitmentSnapshot | undefined {
    return this.memory.getFitment(sessionId);
  }

  setFitment(sessionId: string, snapshot: FitmentSnapshot | undefined): void {
    this.memory.setFitment(sessionId, snapshot);
  }

  getContactWorkflow(sessionId: string): ContactWorkflowSnapshot | undefined {
    return this.memory.getContactWorkflow(sessionId);
  }

  setContactWorkflow(
    sessionId: string,
    snapshot: ContactWorkflowSnapshot | undefined,
  ): void {
    this.memory.setContactWorkflow(sessionId, snapshot);
  }

  async load(sessionId: string): Promise<void> {
    if (this.loaded.has(sessionId)) {
      return;
    }
    const rows = await this.store.selectEq<AgentStateRow>(
      'eva_bot',
      'session_agent_state',
      'session_id',
      sessionId,
    );
    const row = rows[0];
    const intent = parseIntent(row?.intent);
    if (intent) {
      this.memory.set(sessionId, intent);
    }
    const quote = parseQuote(row?.quote_workflow);
    if (quote) {
      this.memory.setQuoteWorkflow(sessionId, quote);
    }
    const fitment = parseFitment(row?.fitment);
    if (fitment) {
      this.memory.setFitment(sessionId, fitment);
    }
    const contact = parseContact(row?.contact_workflow);
    if (contact) {
      this.memory.setContactWorkflow(sessionId, contact);
    }
    this.loaded.add(sessionId);
  }

  async flush(sessionId: string): Promise<void> {
    await this.store.upsert(
      'eva_bot',
      'session_agent_state',
      {
        session_id: sessionId,
        intent: this.memory.get(sessionId) ?? null,
        quote_workflow: this.memory.getQuoteWorkflow(sessionId) ?? null,
        fitment: this.memory.getFitment(sessionId) ?? null,
        contact_workflow: this.memory.getContactWorkflow(sessionId) ?? null,
        updated_at: new Date().toISOString(),
      },
      'session_id',
    );
    this.loaded.add(sessionId);
  }
}

function parseIntent(value: unknown): ShopIntent | undefined {
  const parsed = shopIntentSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

function parseQuote(value: unknown): QuoteWorkflowSnapshot | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  const row = value as QuoteWorkflowSnapshot;
  if (row.workflow !== QUOTE_VEHICLE_WORKFLOW || row.step !== 'waiting_for_vehicle') {
    return undefined;
  }
  return row;
}

function parseContact(value: unknown): ContactWorkflowSnapshot | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  const row = value as ContactWorkflowSnapshot;
  if (
    row.workflow !== COLLECT_CONTACT_WORKFLOW ||
    row.step !== 'waiting_for_contact' ||
    (row.missing !== 'given_name' && row.missing !== 'phone')
  ) {
    return undefined;
  }
  return row;
}

function parseFitment(value: unknown): FitmentSnapshot | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  const row = value as FitmentSnapshot;
  if (row.workflow !== FITMENT_CASCADE_WORKFLOW || row.step !== 'waiting_for_vehicle') {
    return undefined;
  }
  return row;
}
