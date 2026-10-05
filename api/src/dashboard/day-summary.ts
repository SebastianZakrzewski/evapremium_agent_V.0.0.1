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

export function eventsBySession(events: AgentEvent[]): Map<string, AgentEvent[]> {
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

export function sessionViolations(sessionId: string, sessionEvents: AgentEvent[]): SessionViolation[] {
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

export function textOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export type AnalyticsAxisCounts = {
  pass: number;
  fail: number;
  skipped: number;
};

export type AnalyticsDay = {
  date: string;
  turns: number;
  pass: number;
  fail: number;
  retrieval: AnalyticsAxisCounts;
  action: AnalyticsAxisCounts;
  byIntent: Array<{ intent: string; turns: number; pass: number }>;
  reasons: Array<{ code: string; count: number }>;
  failures: Array<{
    sessionId: string;
    occurredAt: string;
    intent: string;
    codes: string[];
  }>;
};

function emptyAxis(): AnalyticsAxisCounts {
  return { pass: 0, fail: 0, skipped: 0 };
}

function readAxis(value: unknown, bucket: AnalyticsAxisCounts): void {
  if (value === 'pass' || value === 'fail' || value === 'skipped') {
    bucket[value] += 1;
  }
}

function readCodes(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((code): code is string => typeof code === 'string');
}

export function summarizeAnalytics(
  date: string,
  events: AgentEvent[],
): AnalyticsDay {
  const retrieval = emptyAxis();
  const action = emptyAxis();
  const intents = new Map<string, { turns: number; pass: number }>();
  const reasons = new Map<string, number>();
  const failures: AnalyticsDay['failures'] = [];
  let pass = 0;
  let fail = 0;

  for (const event of events) {
    if (event.type !== 'turn_judged') {
      continue;
    }
    const verdict = event.payload.verdict;
    if (verdict !== 'pass' && verdict !== 'fail') {
      continue;
    }
    if (verdict === 'pass') {
      pass += 1;
    } else {
      fail += 1;
    }
    readAxis(event.payload.retrieval, retrieval);
    readAxis(event.payload.action, action);
    const intent = textOrNull(event.payload.intent) ?? 'out_of_scope';
    const row = intents.get(intent) ?? { turns: 0, pass: 0 };
    row.turns += 1;
    if (verdict === 'pass') {
      row.pass += 1;
    }
    intents.set(intent, row);
    const codes = readCodes(event.payload.codes);
    for (const code of codes) {
      reasons.set(code, (reasons.get(code) ?? 0) + 1);
    }
    if (verdict === 'fail') {
      failures.push({
        sessionId: event.sessionId,
        occurredAt: event.occurredAt,
        intent,
        codes,
      });
    }
  }

  failures.sort((left, right) => left.occurredAt.localeCompare(right.occurredAt));

  return {
    date,
    turns: pass + fail,
    pass,
    fail,
    retrieval,
    action,
    byIntent: [...intents.entries()]
      .map(([intent, row]) => ({ intent, turns: row.turns, pass: row.pass }))
      .sort((left, right) => left.intent.localeCompare(right.intent)),
    reasons: [...reasons.entries()]
      .map(([code, count]) => ({ code, count }))
      .sort((left, right) => right.count - left.count || left.code.localeCompare(right.code)),
    failures,
  };
}

