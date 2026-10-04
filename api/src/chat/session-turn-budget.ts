import { createHash } from 'node:crypto';
import type { DataStore } from '../supabase/data-store';

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

type BucketKind = 'ip_turn' | 'ip_session';

export class InMemoryChatTurnBudget implements ChatTurnBudget {
  private readonly sessionTurns = new Map<string, number>();
  private readonly buckets = new Map<string, number>();
  private tail: Promise<void> = Promise.resolve();

  constructor(private readonly limits: TurnBudgetLimits) {}

  reserveSessionTurn(sessionId: string): Promise<boolean> {
    return this.exclusive(() => this.takeSession(sessionId));
  }

  reserveGuestTurn(ip: string, now: Date): Promise<boolean> {
    return this.exclusive(() => this.takeGuest('ip_turn', ip, now, this.limits.guestTurns));
  }

  reserveGuestSession(ip: string, now: Date): Promise<boolean> {
    return this.exclusive(() =>
      this.takeGuest('ip_session', ip, now, this.limits.guestSessions),
    );
  }

  reserveUserMessage(sessionId: string, ip: string, now: Date): Promise<boolean> {
    return this.exclusive(() => {
      const hash = guestSubjectHash(ip, this.limits.salt);
      if (!hash) {
        return false;
      }
      const turns = this.sessionTurns.get(sessionId) ?? 0;
      const guest = this.readBucket('ip_turn', hash, now);
      if (turns >= this.limits.sessionTurns || guest >= this.limits.guestTurns) {
        return false;
      }
      this.sessionTurns.set(sessionId, turns + 1);
      this.writeBucket('ip_turn', hash, now, guest + 1);
      return true;
    });
  }

  sessionTurnCount(sessionId: string): Promise<number> {
    return Promise.resolve(this.sessionTurns.get(sessionId) ?? 0);
  }

  guestTurnCount(ip: string, now: Date): Promise<number> {
    return Promise.resolve(this.peek('ip_turn', ip, now));
  }

  guestSessionCount(ip: string, now: Date): Promise<number> {
    return Promise.resolve(this.peek('ip_session', ip, now));
  }

  storedGuestBuckets(): number {
    return this.buckets.size;
  }

  private takeSession(sessionId: string): boolean {
    const turns = this.sessionTurns.get(sessionId) ?? 0;
    if (turns >= this.limits.sessionTurns) {
      return false;
    }
    this.sessionTurns.set(sessionId, turns + 1);
    return true;
  }

  private takeGuest(kind: BucketKind, ip: string, now: Date, limit: number): boolean {
    const hash = guestSubjectHash(ip, this.limits.salt);
    if (!hash) {
      return false;
    }
    const count = this.readBucket(kind, hash, now);
    if (count >= limit) {
      return false;
    }
    this.writeBucket(kind, hash, now, count + 1);
    return true;
  }

  private peek(kind: BucketKind, ip: string, now: Date): number {
    const hash = guestSubjectHash(ip, this.limits.salt);
    if (!hash) {
      return 0;
    }
    return this.readBucket(kind, hash, now);
  }

  private readBucket(kind: BucketKind, hash: string, now: Date): number {
    return this.buckets.get(this.bucketKey(kind, hash, now)) ?? 0;
  }

  private writeBucket(kind: BucketKind, hash: string, now: Date, count: number): void {
    this.buckets.set(this.bucketKey(kind, hash, now), count);
  }

  private bucketKey(kind: BucketKind, hash: string, now: Date): string {
    return `${kind}\0${hash}\0${utcHourStart(now)}`;
  }

  private exclusive<T>(work: () => T): Promise<T> {
    const run = this.tail.then(() => work());
    this.tail = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }
}

type SessionBudgetRow = {
  id: string;
  user_turns?: number | null;
};

type UsageBucketRow = {
  bucket_key: string;
  subject_kind: BucketKind;
  subject_hash: string;
  window_start: string;
  count: number;
};

export class SupabaseChatTurnBudget implements ChatTurnBudget {
  private tail: Promise<void> = Promise.resolve();

  constructor(
    private readonly store: DataStore,
    private readonly limits: TurnBudgetLimits,
  ) {}

  reserveSessionTurn(sessionId: string): Promise<boolean> {
    return this.exclusive(() => this.takeSession(sessionId));
  }

  reserveGuestTurn(ip: string, now: Date): Promise<boolean> {
    return this.exclusive(() => this.takeGuest('ip_turn', ip, now, this.limits.guestTurns));
  }

  reserveGuestSession(ip: string, now: Date): Promise<boolean> {
    return this.exclusive(() =>
      this.takeGuest('ip_session', ip, now, this.limits.guestSessions),
    );
  }

  async reserveUserMessage(sessionId: string, ip: string, now: Date): Promise<boolean> {
    return this.exclusive(async () => {
      const hash = guestSubjectHash(ip, this.limits.salt);
      if (!hash) {
        return false;
      }
      const row = await this.sessionRow(sessionId);
      if (!row) {
        return false;
      }
      const turns = Number(row.user_turns ?? 0);
      const guest = await this.bucketCount('ip_turn', hash, now);
      if (turns >= this.limits.sessionTurns || guest >= this.limits.guestTurns) {
        return false;
      }
      await this.store.upsert(
        'eva_bot',
        'chat_sessions',
        { ...row, user_turns: turns + 1 },
        'id',
      );
      await this.writeBucket('ip_turn', hash, now, guest + 1);
      return true;
    });
  }

  async sessionTurnCount(sessionId: string): Promise<number> {
    const row = await this.sessionRow(sessionId);
    return Number(row?.user_turns ?? 0);
  }

  async guestTurnCount(ip: string, now: Date): Promise<number> {
    const hash = guestSubjectHash(ip, this.limits.salt);
    if (!hash) {
      return 0;
    }
    return this.bucketCount('ip_turn', hash, now);
  }

  async guestSessionCount(ip: string, now: Date): Promise<number> {
    const hash = guestSubjectHash(ip, this.limits.salt);
    if (!hash) {
      return 0;
    }
    return this.bucketCount('ip_session', hash, now);
  }

  private async takeSession(sessionId: string): Promise<boolean> {
    const row = await this.sessionRow(sessionId);
    if (!row) {
      return false;
    }
    const turns = Number(row.user_turns ?? 0);
    if (turns >= this.limits.sessionTurns) {
      return false;
    }
    await this.store.upsert(
      'eva_bot',
      'chat_sessions',
      { ...row, user_turns: turns + 1 },
      'id',
    );
    return true;
  }

  private async takeGuest(
    kind: BucketKind,
    ip: string,
    now: Date,
    limit: number,
  ): Promise<boolean> {
    const hash = guestSubjectHash(ip, this.limits.salt);
    if (!hash) {
      return false;
    }
    const count = await this.bucketCount(kind, hash, now);
    if (count >= limit) {
      return false;
    }
    await this.writeBucket(kind, hash, now, count + 1);
    return true;
  }

  private async sessionRow(sessionId: string): Promise<SessionBudgetRow | undefined> {
    const rows = await this.store.selectEq<SessionBudgetRow>(
      'eva_bot',
      'chat_sessions',
      'id',
      sessionId,
    );
    return rows[0];
  }

  private async bucketCount(kind: BucketKind, hash: string, now: Date): Promise<number> {
    const rows = await this.store.selectEq<UsageBucketRow>(
      'eva_bot',
      'usage_buckets',
      'bucket_key',
      bucketKey(kind, hash, now),
    );
    return Number(rows[0]?.count ?? 0);
  }

  private async writeBucket(
    kind: BucketKind,
    hash: string,
    now: Date,
    count: number,
  ): Promise<void> {
    const window = utcHourStart(now);
    await this.store.upsert(
      'eva_bot',
      'usage_buckets',
      {
        bucket_key: bucketKey(kind, hash, now),
        subject_kind: kind,
        subject_hash: hash,
        window_start: window,
        count,
      },
      'bucket_key',
    );
  }

  private exclusive<T>(work: () => Promise<T>): Promise<T> {
    const run = this.tail.then(work, work);
    this.tail = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }
}

function bucketKey(kind: BucketKind, hash: string, now: Date): string {
  return `${kind}\0${hash}\0${utcHourStart(now)}`;
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
