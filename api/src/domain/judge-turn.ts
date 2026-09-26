export const TURN_JUDGE_CODES = [
  'no_search',
  'second_search',
  'no_lookup',
  'lookup_outside',
  'lookup_not_top',
  'lookup_without_search',
  'tool_out_of_profile',
  'missing_tool',
] as const;

export type TurnJudgeCode = (typeof TURN_JUDGE_CODES)[number];

export type JudgeAxis = 'pass' | 'fail' | 'skipped';

export type TurnLookupTrace = {
  slug: string;
  agreement: 'top' | 'listed' | 'outside' | 'none';
  outcome: 'hit' | 'miss';
};

export type TurnSearchTrace = {
  slugs: readonly string[];
  confidence?: 'high' | 'ambiguous';
};

export type TurnExecutionKind =
  | 'profile'
  | 'knowledge'
  | 'tool'
  | 'workflow'
  | 'clarify';

export type TurnJudgeInput = {
  intent: string;
  execution: TurnExecutionKind;
  allowedTools: readonly string[];
  expectedTool?: string;
  searches: readonly TurnSearchTrace[];
  lookups: readonly TurnLookupTrace[];
  tools: readonly string[];
};

export type TurnJudgment = {
  intent: string;
  retrieval: JudgeAxis;
  action: JudgeAxis;
  verdict: 'pass' | 'fail';
  codes: TurnJudgeCode[];
  slugs: string[];
  confidence?: 'high' | 'ambiguous';
  lookups: TurnLookupTrace[];
  tools: string[];
};

function unique(codes: TurnJudgeCode[]): TurnJudgeCode[] {
  return TURN_JUDGE_CODES.filter((code) => codes.includes(code));
}

function retrievalApplies(input: TurnJudgeInput): boolean {
  if (input.execution === 'knowledge') {
    return true;
  }
  return (
    input.execution === 'profile' &&
    (input.searches.length > 0 || input.lookups.length > 0)
  );
}

function judgeRetrieval(input: TurnJudgeInput): {
  axis: JudgeAxis;
  codes: TurnJudgeCode[];
} {
  if (!retrievalApplies(input)) {
    return { axis: 'skipped', codes: [] };
  }
  const codes: TurnJudgeCode[] = [];
  if (input.searches.length === 0) {
    codes.push('no_search');
  }
  if (input.searches.length > 1) {
    codes.push('second_search');
  }
  const search = input.searches[0];
  const slugs = search?.slugs ?? [];
  if (slugs.length > 0 && input.lookups.length === 0) {
    codes.push('no_lookup');
  }
  for (const lookup of input.lookups) {
    if (lookup.agreement === 'outside') {
      codes.push('lookup_outside');
    } else if (lookup.agreement === 'none') {
      codes.push('lookup_without_search');
    } else if (search?.confidence === 'high' && lookup.agreement !== 'top') {
      codes.push('lookup_not_top');
    }
  }
  const settled = unique(codes);
  return { axis: settled.length === 0 ? 'pass' : 'fail', codes: settled };
}

function judgeAction(input: TurnJudgeInput): {
  axis: JudgeAxis;
  codes: TurnJudgeCode[];
} {
  const codes: TurnJudgeCode[] = [];
  const allowed = new Set(input.allowedTools);
  if (input.tools.some((tool) => !allowed.has(tool))) {
    codes.push('tool_out_of_profile');
  }
  if (
    input.execution === 'tool' &&
    input.expectedTool !== undefined &&
    !input.tools.includes(input.expectedTool)
  ) {
    codes.push('missing_tool');
  }
  const settled = unique(codes);
  return { axis: settled.length === 0 ? 'pass' : 'fail', codes: settled };
}

export function judgeTurn(input: TurnJudgeInput): TurnJudgment {
  const retrieval = judgeRetrieval(input);
  const action = judgeAction(input);
  const search = input.searches[0];
  const verdict =
    retrieval.axis === 'fail' || action.axis === 'fail' ? 'fail' : 'pass';
  return {
    intent: input.intent,
    retrieval: retrieval.axis,
    action: action.axis,
    verdict,
    codes: unique([...retrieval.codes, ...action.codes]),
    slugs: [...(search?.slugs ?? [])],
    confidence: search?.confidence,
    lookups: input.lookups.map((lookup) => ({ ...lookup })),
    tools: [...input.tools],
  };
}

export function turnJudgmentPayload(
  judgment: TurnJudgment,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    intent: judgment.intent,
    retrieval: judgment.retrieval,
    action: judgment.action,
    verdict: judgment.verdict,
    codes: judgment.codes,
    slugs: judgment.slugs,
    lookups: judgment.lookups,
    tools: judgment.tools,
  };
  if (judgment.confidence !== undefined) {
    payload.confidence = judgment.confidence;
  }
  return payload;
}
