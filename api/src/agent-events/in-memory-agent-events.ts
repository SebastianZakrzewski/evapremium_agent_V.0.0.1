import { randomUUID } from 'node:crypto';
import type {
  AgentEvent,
  AgentEventRecord,
  AgentEventStore,
} from './agent-event';

export class InMemoryAgentEvents implements AgentEventStore {
  private readonly events: AgentEvent[] = [];

  constructor(
    private readonly now: () => Date = () => new Date(),
    private readonly nextId: () => string = () => randomUUID(),
  ) {}

  async append(event: AgentEventRecord): Promise<void> {
    this.events.push({
      id: this.nextId(),
      occurredAt: this.now().toISOString(),
      sessionId: event.sessionId,
      type: event.type,
      payload: event.payload,
    });
  }

  list(): AgentEvent[] {
    return [...this.events];
  }

  async listBySession(sessionId: string): Promise<AgentEvent[]> {
    return this.events.filter((row) => row.sessionId === sessionId);
  }

  async listInRange(fromIso: string, toIso: string): Promise<AgentEvent[]> {
    const from = Date.parse(fromIso);
    const to = Date.parse(toIso);
    return this.events.filter((row) => {
      const at = Date.parse(row.occurredAt);
      return at >= from && at <= to;
    });
  }
}
