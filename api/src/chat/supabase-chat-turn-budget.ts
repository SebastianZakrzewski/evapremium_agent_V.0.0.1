import type { DataStore } from '../supabase/data-store';
import {
  guestSubjectHash,
  utcHourStart,
  type ChatTurnBudget,
  type TurnBudgetLimits,
} from './turn-budget';

type BucketKind = 'ip_turn' | 'ip_session';

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
  return `${kind}|${hash}|${utcHourStart(now)}`;
}
