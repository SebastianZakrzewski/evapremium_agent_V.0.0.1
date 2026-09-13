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
}
