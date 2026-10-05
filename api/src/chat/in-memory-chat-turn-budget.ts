import {
  guestSubjectHash,
  utcHourStart,
  type ChatTurnBudget,
  type TurnBudgetLimits,
} from './turn-budget';

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
    return `${kind}|${hash}|${utcHourStart(now)}`;
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
