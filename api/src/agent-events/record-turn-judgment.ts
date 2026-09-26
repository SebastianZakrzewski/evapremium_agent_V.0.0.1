import type { ExecutionChoice } from '../domain/choose-execution';
import { judgeTurn, turnJudgmentPayload } from '../domain/judge-turn';
import type { AgentEventSink } from './agent-event';
import { recordAgentEvent } from './record-agent-event';
import { takeTurnTrace } from './turn-trace';

export function recordTurnJudgment(
  events: AgentEventSink | undefined,
  sessionId: string,
  turn: {
    intent: string;
    execution: ExecutionChoice;
    allowedTools: readonly string[];
  },
): void {
  const trace = takeTurnTrace(sessionId);
  const judgment = judgeTurn({
    intent: turn.intent,
    execution: turn.execution.kind,
    allowedTools: turn.allowedTools,
    expectedTool:
      turn.execution.kind === 'tool' ? turn.execution.tool : undefined,
    searches: trace.searches,
    lookups: trace.lookups,
    tools: trace.tools,
  });
  recordAgentEvent(
    events,
    'turn_judged',
    turnJudgmentPayload(judgment),
    sessionId,
  );
}
