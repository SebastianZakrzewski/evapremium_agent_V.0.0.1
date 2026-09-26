import type { IntentTurnLog } from '../mastra/intents/intent-turn-log';
import type {
  TreeLookupAgreement,
  TreeLookupLog,
  TreeLookupOutcome,
  TreeSearchLog,
} from './tree-turn-log';

const MAX_LINES = 200;

export type ContainerIntentLog = {
  seq: number;
  occurredAt: string;
  kind: 'intent-turn';
  sessionId?: string;
  currentIntent?: string;
  candidateIntent?: string;
  acceptedIntent: string;
  subIntent: string | null;
  mode: string | null;
  execution: string;
  executionTarget?: string;
  tools: string[];
  forcedOutOfScope: boolean;
};

export type ContainerToolLog = {
  seq: number;
  occurredAt: string;
  kind: 'tool';
  toolId: string;
};

export type ContainerTreeSearchLog = {
  seq: number;
  occurredAt: string;
  kind: 'tree-search';
  sessionId?: string;
  preferredBranches: string[];
  rankedBranches: string[];
  leaves: Array<{ slug: string; confidence: string }>;
};

export type ContainerTreeLookupLog = {
  seq: number;
  occurredAt: string;
  kind: 'tree-lookup';
  sessionId?: string;
  slug: string;
  outcome: TreeLookupOutcome;
  agreement: TreeLookupAgreement;
};

export type ContainerLogLine =
  | ContainerIntentLog
  | ContainerToolLog
  | ContainerTreeSearchLog
  | ContainerTreeLookupLog;

export class ContainerLogBuffer {
  private seq = 0;
  private lines: ContainerLogLine[] = [];

  appendIntent(entry: IntentTurnLog, now: Date = new Date()): ContainerIntentLog {
    const line: ContainerIntentLog = {
      seq: this.nextSeq(),
      occurredAt: now.toISOString(),
      kind: 'intent-turn',
      sessionId: entry.sessionId,
      currentIntent: entry.currentIntent,
      candidateIntent: entry.candidateIntent,
      acceptedIntent: entry.acceptedIntent,
      subIntent: entry.subIntent ?? null,
      mode: entry.mode ?? null,
      execution: entry.execution ?? 'profile',
      executionTarget: entry.executionTarget,
      tools: [...entry.tools],
      forcedOutOfScope: entry.forcedOutOfScope,
    };
    this.push(line);
    return line;
  }

  appendTreeSearch(
    entry: TreeSearchLog,
    now: Date = new Date(),
  ): ContainerTreeSearchLog {
    const line: ContainerTreeSearchLog = {
      seq: this.nextSeq(),
      occurredAt: now.toISOString(),
      kind: 'tree-search',
      sessionId: entry.sessionId,
      preferredBranches: [...entry.preferredBranches],
      rankedBranches: [...entry.rankedBranches],
      leaves: entry.leaves.map((leaf) => ({
        slug: leaf.slug,
        confidence: leaf.confidence,
      })),
    };
    this.push(line);
    return line;
  }

  appendTreeLookup(
    entry: TreeLookupLog,
    now: Date = new Date(),
  ): ContainerTreeLookupLog {
    const line: ContainerTreeLookupLog = {
      seq: this.nextSeq(),
      occurredAt: now.toISOString(),
      kind: 'tree-lookup',
      sessionId: entry.sessionId,
      slug: entry.slug,
      outcome: entry.outcome,
      agreement: entry.agreement,
    };
    this.push(line);
    return line;
  }

  appendTool(toolId: string, now: Date = new Date()): ContainerToolLog {
    const line: ContainerToolLog = {
      seq: this.nextSeq(),
      occurredAt: now.toISOString(),
      kind: 'tool',
      toolId,
    };
    this.push(line);
    return line;
  }

  list(after?: number): ContainerLogLine[] {
    if (after === undefined || !Number.isInteger(after)) {
      return [...this.lines];
    }
    const max = this.lines.at(-1)?.seq ?? 0;
    if (after > max) {
      return [...this.lines];
    }
    return this.lines.filter((line) => line.seq > after);
  }

  clear(): void {
    this.seq = 0;
    this.lines = [];
  }

  private nextSeq(): number {
    this.seq += 1;
    return this.seq;
  }

  private push(line: ContainerLogLine): void {
    this.lines.push(line);
    if (this.lines.length > MAX_LINES) {
      this.lines.splice(0, this.lines.length - MAX_LINES);
    }
  }
}

export const containerLogs = new ContainerLogBuffer();
