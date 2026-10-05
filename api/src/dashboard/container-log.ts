import type { AgentEvent } from '../agent-events/agent-event';
import { textOrNull } from './day-summary';
import { timelineEvents } from './session-markers';

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

function traceTarget(payload: Record<string, unknown>): string | undefined {
  return textOrNull(payload.tool) ?? textOrNull(payload.workflow) ?? undefined;
}

const CONTAINER_TURN_TYPES = new Set<AgentEvent['type']>([
  'decision_trace',
  'intent_accepted',
]);

function afterSince(occurredAt: string, since?: string): boolean {
  const sinceMs = since === undefined ? Number.NaN : Date.parse(since);
  if (Number.isNaN(sinceMs)) {
    return true;
  }
  return Date.parse(occurredAt) > sinceMs;
}

export function decisionTraceEvents(
  events: AgentEvent[],
  since?: string,
): AgentEvent[] {
  return timelineEvents(events).filter(
    (event) => event.type === 'decision_trace' && afterSince(event.occurredAt, since),
  );
}

export function containerTurnEvents(
  events: AgentEvent[],
  since?: string,
): AgentEvent[] {
  const rows = timelineEvents(events).filter(
    (event) =>
      CONTAINER_TURN_TYPES.has(event.type) && afterSince(event.occurredAt, since),
  );
  const traces = rows.filter((event) => event.type === 'decision_trace');
  return rows.filter((event) => {
    if (event.type !== 'intent_accepted') {
      return true;
    }
    const at = Date.parse(event.occurredAt);
    return !traces.some(
      (trace) =>
        trace.sessionId === event.sessionId &&
        Math.abs(Date.parse(trace.occurredAt) - at) <= TRACE_MATCH_MS,
    );
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
): Array<(T & { traceAt?: string }) | DecisionTraceLogLine> {
  const used = new Set<string>();
  const lines = memory.map((line) => {
    const match = nearestTrace(line, traces, used);
    if (match === undefined) {
      return line;
    }
    used.add(match.id);
    const traceAt = match.occurredAt;
    if (line.subIntent) {
      return { ...line, traceAt };
    }
    const filled = decisionTraceLogLine(match);
    return {
      ...line,
      traceAt,
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

export function pageContainerLog<T extends MemoryLogLine>(
  buffered: T[],
  page: T[],
  traces: AgentEvent[],
): Array<(T & { traceAt?: string }) | DecisionTraceLogLine> {
  const merged = mergeContainerLog(buffered, traces);
  const pageSeqs = new Set(page.map((line) => line.seq));
  return merged.filter((line) => !('seq' in line) || pageSeqs.has(line.seq));
}
