import type { IntentTurnLog } from '../mastra/intents/intent-turn-log';

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

export type ContainerLogLine = ContainerIntentLog | ContainerToolLog;

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
