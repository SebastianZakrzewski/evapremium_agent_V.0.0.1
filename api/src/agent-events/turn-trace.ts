import type { TurnLookupTrace, TurnSearchTrace } from '../domain/judge-turn';

export type OpenTurnTrace = {
  searches: TurnSearchTrace[];
  lookups: TurnLookupTrace[];
  tools: string[];
};

const open = new Map<string, OpenTurnTrace>();

function blank(): OpenTurnTrace {
  return { searches: [], lookups: [], tools: [] };
}

export function beginTurnTrace(sessionId: string): void {
  open.set(sessionId, blank());
}

export function noteTurnSearch(
  sessionId: string | undefined,
  search: TurnSearchTrace,
): void {
  if (sessionId === undefined) {
    return;
  }
  open.get(sessionId)?.searches.push({
    slugs: [...search.slugs],
    confidence: search.confidence,
  });
}

export function noteTurnLookup(
  sessionId: string | undefined,
  lookup: TurnLookupTrace,
): void {
  if (sessionId === undefined) {
    return;
  }
  open.get(sessionId)?.lookups.push({ ...lookup });
}

export function noteTurnTool(
  sessionId: string | undefined,
  toolId: string,
): void {
  if (sessionId === undefined) {
    return;
  }
  open.get(sessionId)?.tools.push(toolId);
}

export function takeTurnTrace(sessionId: string): OpenTurnTrace {
  const trace = open.get(sessionId) ?? blank();
  open.delete(sessionId);
  return trace;
}
