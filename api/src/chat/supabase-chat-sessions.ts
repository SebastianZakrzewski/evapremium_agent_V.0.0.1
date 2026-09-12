import type { DataStore } from '../supabase/data-store';
import {
  UnknownSessionError,
  type ChatMessageRecord,
  type ChatSessions,
} from './chat-session';

type SessionRow = { id: string };
type MessageRow = {
  session_id: string;
  direction: 'inbound' | 'outbound';
  role: string;
  text: string;
};

export class SupabaseChatSessions implements ChatSessions {
  constructor(private readonly store: DataStore) {}

  async create(): Promise<{ sessionId: string }> {
    const row = await this.store.insert('eva_bot', 'chat_sessions', {});
    return { sessionId: String(row.id) };
  }

  async assertExists(sessionId: string): Promise<void> {
    const rows = await this.store.selectEq<SessionRow>(
      'eva_bot',
      'chat_sessions',
      'id',
      sessionId,
    );
    if (rows.length === 0) {
      throw new UnknownSessionError();
    }
  }

  async appendMessage(record: ChatMessageRecord): Promise<void> {
    await this.assertExists(record.sessionId);
    await this.store.insert('eva_bot', 'chat_messages', {
      session_id: record.sessionId,
      direction: record.role === 'user' ? 'inbound' : 'outbound',
      role: record.role,
      text: record.body,
    });
  }

  async listMessages(sessionId: string): Promise<ChatMessageRecord[]> {
    await this.assertExists(sessionId);
    const rows = await this.store.selectEq<MessageRow>(
      'eva_bot',
      'chat_messages',
      'session_id',
      sessionId,
    );
    return rows
      .filter((row) => row.role === 'user' || row.role === 'assistant')
      .map((row) => ({
        sessionId: row.session_id,
        role: row.role as ChatMessageRecord['role'],
        body: row.text,
      }));
  }
}
