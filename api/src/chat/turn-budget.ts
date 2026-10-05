import { createHash } from 'node:crypto';

export const CHAT_TURN_BUDGET = Symbol('CHAT_TURN_BUDGET');

export const DEFAULT_SESSION_TURN_LIMIT = 25;
export const DEFAULT_GUEST_TURN_LIMIT = 40;
export const DEFAULT_GUEST_SESSION_LIMIT = 10;

export class TurnBudgetExceededError extends Error {
  readonly error = 'turn_budget_exceeded' as const;

  constructor() {
    super('turn_budget_exceeded');
    this.name = 'TurnBudgetExceededError';
  }
}

export type TurnBudgetLimits = {
  sessionTurns: number;
  guestTurns: number;
  guestSessions: number;
  salt: string;
};

export type ChatTurnBudget = {
  reserveSessionTurn(sessionId: string): Promise<boolean>;
  reserveGuestTurn(ip: string, now: Date): Promise<boolean>;
  reserveGuestSession(ip: string, now: Date): Promise<boolean>;
  reserveUserMessage(sessionId: string, ip: string, now: Date): Promise<boolean>;
  sessionTurnCount(sessionId: string): Promise<number>;
  guestTurnCount(ip: string, now: Date): Promise<number>;
  guestSessionCount(ip: string, now: Date): Promise<number>;
};

export function turnBudgetLimitsFromEnv(
  env: NodeJS.ProcessEnv,
  options?: { requireSalt?: boolean },
): TurnBudgetLimits {
  const salt = env.CHAT_BUDGET_IP_SALT ?? '';
  if (options?.requireSalt && salt === '') {
    throw new Error('CHAT_BUDGET_IP_SALT is required');
  }
  return {
    sessionTurns: readPositive(env, 'CHAT_SESSION_TURN_LIMIT', DEFAULT_SESSION_TURN_LIMIT),
    guestTurns: readPositive(env, 'CHAT_IP_TURN_LIMIT', DEFAULT_GUEST_TURN_LIMIT),
    guestSessions: readPositive(env, 'CHAT_IP_SESSION_LIMIT', DEFAULT_GUEST_SESSION_LIMIT),
    salt,
  };
}

export function utcHourStart(now: Date): string {
  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      now.getUTCHours(),
      0,
      0,
      0,
    ),
  ).toISOString();
}

export function guestSubjectHash(ip: string, salt: string): string | undefined {
  if (ip.trim() === '' || salt === '') {
    return undefined;
  }
  return createHash('sha256').update(`${salt}\0${ip}`).digest('hex');
}


function readPositive(env: NodeJS.ProcessEnv, name: string, fallback: number): number {
  const raw = env[name];
  if (raw === undefined || raw.trim() === '') {
    return fallback;
  }
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return value;
}

