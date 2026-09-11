export class UnknownSessionError extends Error {
  constructor() {
    super('unknown session');
    this.name = 'UnknownSessionError';
  }
}

export class InMemoryChatSessions {
  private readonly ids = new Set<string>();

  constructor(private readonly createId: () => string) {}

  create(): { sessionId: string } {
    const sessionId = this.createId();
    this.ids.add(sessionId);
    return { sessionId };
  }

  assertExists(sessionId: string): void {
    if (!this.ids.has(sessionId)) {
      throw new UnknownSessionError();
    }
  }
}
