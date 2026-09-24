import type { AgentEvent } from '../agent-events/agent-event';

export type DayRange = { fromIso: string; toIso: string };

export type SessionViolation = {
  sessionId: string;
  reason: string;
};

export type DaySummary = {
  date: string;
  relief: { sessions: number };
  quote: { issued: number; violations: number };
  truth: { hits: number; misses: number };
  lead: { created: number; skipped: number };
  violations: SessionViolation[];
};

export type SessionMarker =
  | 'intent'
  | 'cascade'
  | 'quote'
  | 'tree'
  | 'lead'
  | 'violation';

export type SessionListItem = {
  sessionId: string;
  markers: SessionMarker[];
};

function eventsBySession(events: AgentEvent[]): Map<string, AgentEvent[]> {
  const grouped = new Map<string, AgentEvent[]>();
  for (const event of events) {
    const list = grouped.get(event.sessionId) ?? [];
    list.push(event);
    grouped.set(event.sessionId, list);
  }
  return grouped;
}

function cascadeIsOne(sessionEvents: AgentEvent[]): boolean {
  const cascades = sessionEvents.filter((row) => row.type === 'cascade_resolved');
  const last = cascades[cascades.length - 1];
  return last?.payload.match === 'one';
}

function hasCreatedLead(sessionEvents: AgentEvent[]): boolean {
  return sessionEvents.some(
    (row) =>
      row.type === 'lead_attempted' && row.payload.outcome === 'created',
  );
}

function sessionViolations(sessionId: string, sessionEvents: AgentEvent[]): SessionViolation[] {
  const violations: SessionViolation[] = [];
  const quotes = sessionEvents.filter((row) => row.type === 'quote_issued');
  if (quotes.length > 0 && !cascadeIsOne(sessionEvents)) {
    violations.push({ sessionId, reason: 'quote_without_cascade_one' });
  }
  return violations;
}

export function utcDayRange(date: string): DayRange {
  return {
    fromIso: `${date}T00:00:00.000Z`,
    toIso: `${date}T23:59:59.999Z`,
  };
}

export function summarizeDay(date: string, events: AgentEvent[]): DaySummary {
  const grouped = eventsBySession(events);
  const violations: SessionViolation[] = [];
  let relief = 0;
  let issued = 0;
  let quoteViolations = 0;
  let hits = 0;
  let misses = 0;
  let created = 0;
  let skipped = 0;

  for (const [sessionId, sessionEvents] of grouped) {
    const hasQuote = sessionEvents.some((row) => row.type === 'quote_issued');
    const hasHit = sessionEvents.some((row) => row.type === 'context_hit');
    if ((hasQuote || hasHit) && !hasCreatedLead(sessionEvents)) {
      relief += 1;
    }
    issued += sessionEvents.filter((row) => row.type === 'quote_issued').length;
    const sessionFails = sessionViolations(sessionId, sessionEvents);
    quoteViolations += sessionFails.length;
    violations.push(...sessionFails);
    hits += sessionEvents.filter((row) => row.type === 'context_hit').length;
    misses += sessionEvents.filter((row) => row.type === 'context_miss').length;
    created += sessionEvents.filter(
      (row) =>
        row.type === 'lead_attempted' && row.payload.outcome === 'created',
    ).length;
    skipped += sessionEvents.filter(
      (row) =>
        row.type === 'lead_attempted' &&
        row.payload.outcome !== 'created',
    ).length;
  }

  return {
    date,
    relief: { sessions: relief },
    quote: { issued, violations: quoteViolations },
    truth: { hits, misses },
    lead: { created, skipped },
    violations,
  };
}

export function listSessionMarkers(
  events: AgentEvent[],
  marker?: SessionMarker,
): SessionListItem[] {
  const grouped = eventsBySession(events);
  const items: SessionListItem[] = [];
  for (const [sessionId, sessionEvents] of grouped) {
    const markers: SessionMarker[] = [];
    if (sessionEvents.some((row) => row.type === 'intent_accepted')) {
      markers.push('intent');
    }
    if (sessionEvents.some((row) => row.type === 'cascade_resolved')) {
      markers.push('cascade');
    }
    if (sessionEvents.some((row) => row.type === 'quote_issued')) {
      markers.push('quote');
    }
    if (
      sessionEvents.some(
        (row) => row.type === 'context_hit' || row.type === 'context_miss',
      )
    ) {
      markers.push('tree');
    }
    if (sessionEvents.some((row) => row.type === 'lead_attempted')) {
      markers.push('lead');
    }
    if (sessionViolations(sessionId, sessionEvents).length > 0) {
      markers.push('violation');
    }
    if (marker && !markers.includes(marker)) {
      continue;
    }
    items.push({ sessionId, markers });
  }
  return items;
}

export function timelineEvents(events: AgentEvent[]): AgentEvent[] {
  return [...events].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
}

const CONTEXT_ACTIVITY_TYPES = new Set<AgentEvent['type']>([
  'context_search',
  'context_hit',
  'context_miss',
]);

export function contextActivityRange(
  since: string | undefined,
  now: Date,
): DayRange {
  const parsed = since === undefined ? Number.NaN : Date.parse(since);
  if (!Number.isNaN(parsed)) {
    return {
      fromIso: new Date(parsed).toISOString(),
      toIso: new Date(now.getTime() + 60_000).toISOString(),
    };
  }
  return utcDayRange(now.toISOString().slice(0, 10));
}

const TRACE_MATCH_MS = 15_000;

export type DecisionTraceLogLine = {
  kind: 'decision-trace';
  id: string;
  occurredAt: string;
  sessionId: string;
  acceptedIntent: string;
  subIntent: string | null;
  mode: string | null;
  execution: string;
  executionTarget?: string;
  tools: string[];
  forcedOutOfScope: boolean;
};

type MemoryLogLine = {
  seq: number;
  occurredAt: string;
  kind: string;
  sessionId?: string;
  subIntent?: string | null;
  mode?: string | null;
  execution?: string;
  executionTarget?: string;
};

function textOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function traceTarget(payload: Record<string, unknown>): string | undefined {
  return textOrNull(payload.tool) ?? textOrNull(payload.workflow) ?? undefined;
}

export function decisionTraceEvents(
  events: AgentEvent[],
  since?: string,
): AgentEvent[] {
  const sinceMs = since === undefined ? Number.NaN : Date.parse(since);
  const hasSince = !Number.isNaN(sinceMs);
  return timelineEvents(events).filter((event) => {
    if (event.type !== 'decision_trace') {
      return false;
    }
    if (!hasSince) {
      return true;
    }
    return Date.parse(event.occurredAt) > sinceMs;
  });
}

function nearestTrace<T extends MemoryLogLine>(
  line: T,
  traces: AgentEvent[],
  used: Set<string>,
): AgentEvent | undefined {
  if (line.kind !== 'intent-turn' || line.sessionId === undefined) {
    return undefined;
  }
  const at = Date.parse(line.occurredAt);
  let best: AgentEvent | undefined;
  let bestDelta = TRACE_MATCH_MS;
  for (const trace of traces) {
    if (used.has(trace.id) || trace.sessionId !== line.sessionId) {
      continue;
    }
    const delta = Math.abs(Date.parse(trace.occurredAt) - at);
    if (delta <= bestDelta) {
      best = trace;
      bestDelta = delta;
    }
  }
  return best;
}

export function decisionTraceLogLine(event: AgentEvent): DecisionTraceLogLine {
  const intent = textOrNull(event.payload.intent) ?? 'out_of_scope';
  const target = traceTarget(event.payload);
  return {
    kind: 'decision-trace',
    id: event.id,
    occurredAt: event.occurredAt,
    sessionId: event.sessionId,
    acceptedIntent: intent,
    subIntent: textOrNull(event.payload.sub_intent),
    mode: textOrNull(event.payload.mode),
    execution: textOrNull(event.payload.execution) ?? 'profile',
    executionTarget: target,
    tools: target === undefined ? [] : [target],
    forcedOutOfScope: intent === 'out_of_scope',
  };
}

export function mergeContainerLog<T extends MemoryLogLine>(
  memory: T[],
  traces: AgentEvent[],
): Array<T | DecisionTraceLogLine> {
  const used = new Set<string>();
  const lines = memory.map((line) => {
    const match = nearestTrace(line, traces, used);
    if (match === undefined) {
      return line;
    }
    used.add(match.id);
    if (line.subIntent) {
      return line;
    }
    const filled = decisionTraceLogLine(match);
    return {
      ...line,
      subIntent: filled.subIntent,
      mode: line.mode ?? filled.mode,
      execution:
        line.execution === undefined || line.execution === 'profile'
          ? filled.execution
          : line.execution,
      executionTarget: line.executionTarget ?? filled.executionTarget,
    };
  });
  const extra = traces
    .filter((trace) => !used.has(trace.id))
    .map((trace) => decisionTraceLogLine(trace));
  return [...lines, ...extra];
}

export function contextActivityEvents(
  events: AgentEvent[],
  since?: string,
): AgentEvent[] {
  const sinceMs = since === undefined ? Number.NaN : Date.parse(since);
  const hasSince = !Number.isNaN(sinceMs);
  return timelineEvents(events).filter((event) => {
    if (!CONTEXT_ACTIVITY_TYPES.has(event.type)) {
      return false;
    }
    if (!hasSince) {
      return true;
    }
    return Date.parse(event.occurredAt) >= sinceMs;
  });
}

export type SessionMessageView = {
  direction: 'inbound' | 'outbound';
  text: string;
};

export type SessionView = {
  sessionId: string;
  messages: SessionMessageView[];
  events: AgentEvent[];
};

export function sessionView(
  sessionId: string,
  messages: { role: 'user' | 'assistant'; body: string }[],
  events: AgentEvent[],
): SessionView {
  return {
    sessionId,
    messages: messages.map((row) => ({
      direction: row.role === 'user' ? 'inbound' : 'outbound',
      text: row.body,
    })),
    events: timelineEvents(events),
  };
}
