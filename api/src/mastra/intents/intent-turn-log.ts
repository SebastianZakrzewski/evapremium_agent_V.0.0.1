import type { ShopIntent, ShopToolId } from './schema';

export type IntentTurnLog = {
  sessionId?: string;
  currentIntent?: ShopIntent;
  candidateIntent?: ShopIntent;
  acceptedIntent: ShopIntent;
  tools: ShopToolId[];
  forcedOutOfScope: boolean;
};

export function formatIntentTurnLog(entry: IntentTurnLog): string {
  const tools = entry.tools.length > 0 ? entry.tools.join(',') : '-';
  return [
    '[intent-turn]',
    `session=${entry.sessionId ?? '-'}`,
    `current=${entry.currentIntent ?? '-'}`,
    `candidate=${entry.candidateIntent ?? '-'}`,
    `accepted=${entry.acceptedIntent}`,
    `tools=${tools}`,
    `forcedOutOfScope=${entry.forcedOutOfScope}`,
  ].join(' ');
}

export function logIntentTurnToConsole(entry: IntentTurnLog): void {
  console.info(formatIntentTurnLog(entry));
}
