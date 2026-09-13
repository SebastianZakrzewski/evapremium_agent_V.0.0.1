import type { DataStore } from '../supabase/data-store';
import type {
  AgentEvent,
  AgentEventRecord,
  AgentEventStore,
  AgentEventType,
} from './agent-event';

type AgentEventRow = {
  id: string;
  session_id: string;
  occurred_at: string;
  type: string;
  payload: Record<string, unknown> | string;
};

function toOccurredAt(value: string): string {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? value : new Date(parsed).toISOString();
}

function toPayload(
  payload: AgentEventRow['payload'],
): Record<string, unknown> {
  if (typeof payload === 'string') {
    return JSON.parse(payload) as Record<string, unknown>;
  }
  return payload ?? {};
}

function toEvent(row: AgentEventRow): AgentEvent {
  return {
    id: row.id,
    sessionId: row.session_id,
    occurredAt: toOccurredAt(String(row.occurred_at)),
    type: row.type as AgentEventType,
    payload: toPayload(row.payload),
  };
}

export class SupabaseAgentEvents implements AgentEventStore {
  constructor(
    private readonly store: DataStore,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async append(event: AgentEventRecord): Promise<void> {
    await this.store.insert('eva_bot', 'agent_events', {
      session_id: event.sessionId,
      occurred_at: this.now().toISOString(),
      type: event.type,
      payload: event.payload,
    });
  }

  async listBySession(sessionId: string): Promise<AgentEvent[]> {
    const rows = await this.store.selectEq<AgentEventRow>(
      'eva_bot',
      'agent_events',
      'session_id',
      sessionId,
    );
    return rows.map(toEvent);
  }

  async listInRange(fromIso: string, toIso: string): Promise<AgentEvent[]> {
    const rows = await this.store.selectAll<AgentEventRow>(
      'eva_bot',
      'agent_events',
    );
    const from = Date.parse(fromIso);
    const to = Date.parse(toIso);
    return rows
      .map(toEvent)
      .filter((row) => {
        const at = Date.parse(row.occurredAt);
        return at >= from && at <= to;
      });
  }
}
