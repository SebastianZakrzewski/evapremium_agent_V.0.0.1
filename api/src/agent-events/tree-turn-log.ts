import { containerLogs } from './container-log-buffer';
import type { LeafRetrievalTrace } from '../domain/branch-retrieval';
import type { LeafSearchConfidence } from '../domain/context-leaf-search';
import { currentTurnSessionId } from './turn-session-context';

export type TreeLookupOutcome = 'hit' | 'miss';
export type TreeLookupAgreement = 'top' | 'listed' | 'outside' | 'none';

export type TreeSearchLog = {
  sessionId?: string;
  preferredBranches: string[];
  rankedBranches: string[];
  leaves: Array<{ slug: string; confidence: LeafSearchConfidence }>;
};

export type TreeLookupLog = {
  sessionId?: string;
  slug: string;
  outcome: TreeLookupOutcome;
  agreement: TreeLookupAgreement;
};

const RESET = '\x1b[0m';
const lastLeaves = new Map<string, string[]>();

function sessionKey(sessionId: string | undefined): string {
  return sessionId ?? '';
}

export function rememberLeafSearch(
  sessionId: string | undefined,
  slugs: readonly string[],
): void {
  lastLeaves.set(sessionKey(sessionId), [...slugs]);
}

export function agreementForLookup(
  sessionId: string | undefined,
  slug: string,
): TreeLookupAgreement {
  const slugs = lastLeaves.get(sessionKey(sessionId));
  if (slugs === undefined) {
    return 'none';
  }
  const index = slugs.indexOf(slug);
  if (index === 0) {
    return 'top';
  }
  if (index > 0) {
    return 'listed';
  }
  return 'outside';
}

export function clearLeafSearchMemory(): void {
  lastLeaves.clear();
}

function colorsEnabled(color: boolean | undefined): boolean {
  if (color !== undefined) {
    return color;
  }
  return !process.env.NO_COLOR;
}

function dye(on: boolean, code: string, text: string): string {
  if (!on) {
    return text;
  }
  return `\x1b[${code}m${text}${RESET}`;
}

function dash(value: string | undefined): string {
  return value && value.length > 0 ? value : '—';
}

function row(on: boolean, label: string, value: string): string {
  return `  ${dye(on, '2', label.padEnd(14))}${value}`;
}

function list(slugs: readonly string[]): string {
  return slugs.length > 0 ? slugs.join(', ') : '—';
}

function confidenceLabel(value: LeafSearchConfidence | undefined): string {
  if (value === 'high') {
    return 'wysoka';
  }
  if (value === 'ambiguous') {
    return 'niejednoznaczna';
  }
  return '—';
}

function agreementLabel(value: TreeLookupAgreement): string {
  if (value === 'top') {
    return '#1';
  }
  if (value === 'listed') {
    return 'w rankingu';
  }
  if (value === 'outside') {
    return 'poza rankingiem';
  }
  return '—';
}

export function formatTreeSearchLog(
  entry: TreeSearchLog,
  options?: { color?: boolean },
): string {
  const on = colorsEnabled(options?.color);
  const confidence = entry.leaves[0]?.confidence;
  const confidenceTone = confidence === 'high' ? '32' : confidence === 'ambiguous' ? '33' : '2';
  return [
    `${dye(on, '1;36', '[drzewo]')} ${dye(on, '2', 'sesja')} ${dash(entry.sessionId)}`,
    row(on, 'gałęzie', dye(on, '35', list(entry.preferredBranches))),
    row(on, 'ranking', dye(on, '35', list(entry.rankedBranches))),
    row(on, 'liście', dye(on, '34', list(entry.leaves.map((leaf) => leaf.slug)))),
    row(on, 'pewność', dye(on, confidenceTone, confidenceLabel(confidence))),
  ].join('\n');
}

export function formatTreeLookupLog(
  entry: TreeLookupLog,
  options?: { color?: boolean },
): string {
  const on = colorsEnabled(options?.color);
  const outcomeTone = entry.outcome === 'hit' ? '32' : '31';
  const agreementTone =
    entry.agreement === 'top' ? '32' : entry.agreement === 'listed' ? '33' : entry.agreement === 'outside' ? '31' : '2';
  return [
    `${dye(on, '1;36', '[drzewo]')} ${dye(on, '2', 'sesja')} ${dash(entry.sessionId)}`,
    row(on, 'liść', dye(on, '34', entry.slug)),
    row(
      on,
      'wynik',
      dye(on, outcomeTone, entry.outcome === 'hit' ? 'trafienie' : 'pudło'),
    ),
    row(on, 'zgodność', dye(on, agreementTone, agreementLabel(entry.agreement))),
  ].join('\n');
}

export function logTreeSearch(trace: LeafRetrievalTrace, sessionId?: string): void {
  const resolved = sessionId ?? currentTurnSessionId();
  rememberLeafSearch(
    resolved,
    trace.leaves.map((leaf) => leaf.slug),
  );
  const entry: TreeSearchLog = {
    sessionId: resolved,
    preferredBranches: trace.preferredBranches,
    rankedBranches: trace.rankedBranches,
    leaves: trace.leaves,
  };
  containerLogs.appendTreeSearch(entry);
  console.info(formatTreeSearchLog(entry));
}

export function logTreeLookup(
  slug: string,
  outcome: TreeLookupOutcome,
  sessionId?: string,
): void {
  const resolved = sessionId ?? currentTurnSessionId();
  const entry: TreeLookupLog = {
    sessionId: resolved,
    slug,
    outcome,
    agreement: agreementForLookup(resolved, slug),
  };
  containerLogs.appendTreeLookup(entry);
  console.info(formatTreeLookupLog(entry));
}
