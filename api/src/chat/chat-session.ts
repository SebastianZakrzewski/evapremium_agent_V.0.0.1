export const CHAT_SESSIONS = Symbol('CHAT_SESSIONS');

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

export interface ChatSessions {
  create(): Promise<{ sessionId: string }>;
  assertExists(sessionId: string): Promise<void>;
  appendMessage(record: ChatMessageRecord): Promise<void>;
  listMessages(sessionId: string): Promise<ChatMessageRecord[]>;
}

export class InMemoryChatSessions implements ChatSessions {
  private readonly ids = new Set<string>();
  private readonly messages: ChatMessageRecord[] = [];

  constructor(private readonly createId: () => string) {}

  async create(): Promise<{ sessionId: string }> {
    const sessionId = this.createId();
    this.ids.add(sessionId);
    return { sessionId };
  }

  async assertExists(sessionId: string): Promise<void> {
    if (!this.ids.has(sessionId)) {
      throw new UnknownSessionError();
    }
  }

  async appendMessage(record: ChatMessageRecord): Promise<void> {
    await this.assertExists(record.sessionId);
    this.messages.push(record);
  }

  async listMessages(sessionId: string): Promise<ChatMessageRecord[]> {
    await this.assertExists(sessionId);
    return this.messages.filter((row) => row.sessionId === sessionId);
  }
}
