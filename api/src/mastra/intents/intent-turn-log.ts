import type { ShopIntent, ShopToolId } from './schema';

export type IntentTurnLog = {
  sessionId?: string;
  currentIntent?: ShopIntent;
  candidateIntent?: ShopIntent;
  acceptedIntent: ShopIntent;
  tools: ShopToolId[];
  forcedOutOfScope: boolean;
};

export type FormatIntentTurnLogOptions = {
  /** Gdy brak, kolory są włączone, chyba że ustawiono niepuste `NO_COLOR`. */
  color?: boolean;
};

const RESET = '\x1b[0m';

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
  return `  ${dye(on, '2', label.padEnd(12))}${value}`;
}

export function formatIntentTurnLog(
  entry: IntentTurnLog,
  options?: FormatIntentTurnLogOptions,
): string {
  const on = colorsEnabled(options?.color);
  const tools =
    entry.tools.length > 0 ? entry.tools.join(', ') : '—';
  const rejected =
    entry.candidateIntent !== undefined &&
    entry.candidateIntent !== entry.acceptedIntent;
  const acceptedTone =
    entry.forcedOutOfScope || entry.acceptedIntent === 'out_of_scope'
      ? '31'
      : '32';
  const scope = entry.forcedOutOfScope
    ? dye(on, '31', 'wymuszony poza ofertą')
    : dye(on, '32', 'w ofercie');

  return [
    `${dye(on, '1;36', '[intent-turn]')} ${dye(on, '2', 'sesja')} ${dash(entry.sessionId)}`,
    row(on, 'było', dye(on, '34', dash(entry.currentIntent))),
    row(
      on,
      'kandydat',
      dye(on, rejected ? '33' : '34', dash(entry.candidateIntent)),
    ),
    row(on, 'przyjęto', dye(on, acceptedTone, entry.acceptedIntent)),
    row(on, 'narzędzia', dye(on, '35', tools)),
    row(on, 'zakres', scope),
  ].join('\n');
}

export function logIntentTurnToConsole(entry: IntentTurnLog): void {
  console.info(formatIntentTurnLog(entry));
}
