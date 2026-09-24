export const AGENT_EVENT_TYPES = [
  'intent_accepted',
  'cascade_resolved',
  'quote_issued',
  'context_hit',
  'context_miss',
  'context_search',
  'lead_attempted',
  'tool_failed',
  'decision_trace',
] as const;

export type AgentEventType = (typeof AGENT_EVENT_TYPES)[number];

export type CascadeMatch = 'none' | 'one' | 'many';

export type LeadAttemptOutcome =
  | 'created'
  | 'skipped_no_consent'
  | 'skipped_no_contact';

export type AgentEventRecord = {
  sessionId: string;
  type: AgentEventType;
  payload: Record<string, unknown>;
};

export type AgentEvent = AgentEventRecord & {
  id: string;
  occurredAt: string;
};

export const AGENT_EVENTS = Symbol('AGENT_EVENTS');

export type AgentEventSink = {
  append(event: AgentEventRecord): Promise<void>;
};

export type AgentEventStore = AgentEventSink & {
  listBySession(sessionId: string): Promise<AgentEvent[]>;
  listInRange(fromIso: string, toIso: string): Promise<AgentEvent[]>;
};
