export class UnknownSessionError extends Error {
  constructor() {
    super('unknown session');
    this.name = 'UnknownSessionError';
  }
}

export type ChatMessageRole = 'user' | 'assistant';

export type ChatMessageRecord = {
  sessionId: string;
  role: ChatMessageRole;
  body: string;
};

export class InMemoryChatSessions {
  private readonly ids = new Set<string>();
  private readonly messages: ChatMessageRecord[] = [];

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

  appendMessage(record: ChatMessageRecord): void {
    this.assertExists(record.sessionId);
    this.messages.push(record);
  }

  listMessages(sessionId: string): ChatMessageRecord[] {
    this.assertExists(sessionId);
    return this.messages.filter((row) => row.sessionId === sessionId);
  }
}
