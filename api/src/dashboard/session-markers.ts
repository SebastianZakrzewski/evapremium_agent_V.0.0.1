import type { AgentEvent } from '../agent-events/agent-event';
import {
  eventsBySession,
  sessionViolations,
  utcDayRange,
  type DayRange,
} from './day-summary';

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
