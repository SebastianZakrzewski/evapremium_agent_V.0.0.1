import type {
  AgentEventSink,
  AgentEventType,
  LeadAttemptOutcome,
} from './agent-event';
import { currentTurnSessionId } from './turn-session-context';

export function recordAgentEvent(
  events: AgentEventSink | undefined,
  type: AgentEventType,
  payload: Record<string, unknown>,
  sessionId = currentTurnSessionId(),
): void {
  if (!events || !sessionId) {
    return;
  }
  void events.append({ sessionId, type, payload });
}

export function recordLeadAttempted(
  events: AgentEventSink | undefined,
  sessionId: string,
  outcome: LeadAttemptOutcome,
): void {
  recordAgentEvent(events, 'lead_attempted', { outcome }, sessionId);
}
