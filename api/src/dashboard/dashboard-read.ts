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
