export type DecisionExecution =
  | 'knowledge'
  | 'tool'
  | 'workflow'
  | 'clarify';

export type DecisionTraceInput = {
  intent: string;
  subIntent: string | null;
  mode: string | null;
  execution: DecisionExecution | 'profile';
  tool?: string;
  workflow?: string;
};

export function decisionTracePayload(
  input: DecisionTraceInput,
): Record<string, string | null> {
  const payload: Record<string, string | null> = {
    intent: input.intent,
    sub_intent: input.subIntent,
    mode: input.mode,
    execution: input.execution === 'profile' ? 'knowledge' : input.execution,
  };
  if (input.execution === 'tool' && input.tool !== undefined) {
    payload.tool = input.tool;
  }
  if (input.execution === 'workflow' && input.workflow !== undefined) {
    payload.workflow = input.workflow;
  }
  return payload;
}
