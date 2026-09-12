import { MemoryDataStore } from '../supabase/data-store';
import { UnknownSessionError } from './chat-session';
import { SupabaseChatSessions } from './supabase-chat-sessions';

describe('SupabaseChatSessions', () => {
  it('writes user/assistant onto existing eva_bot message columns', async () => {
    const store = new MemoryDataStore();
    const sessions = new SupabaseChatSessions(store);
    const { sessionId } = await sessions.create();
    await sessions.appendMessage({
      sessionId,
      role: 'user',
      body: 'golf 8',
    });
    await sessions.appendMessage({
      sessionId,
      role: 'assistant',
      body: 'quoted',
    });
    await expect(sessions.listMessages(sessionId)).resolves.toEqual([
      { sessionId, role: 'user', body: 'golf 8' },
      { sessionId, role: 'assistant', body: 'quoted' },
    ]);
    const raw = await store.selectEq<Record<string, unknown>>(
      'eva_bot',
      'chat_messages',
      'session_id',
      sessionId,
    );
    expect(raw).toEqual([
      expect.objectContaining({
        direction: 'inbound',
        role: 'user',
        text: 'golf 8',
      }),
      expect.objectContaining({
        direction: 'outbound',
        role: 'assistant',
        text: 'quoted',
      }),
    ]);
  });

  it('rejects an unknown session', async () => {
    const sessions = new SupabaseChatSessions(new MemoryDataStore());
    await expect(sessions.assertExists('missing')).rejects.toBeInstanceOf(
      UnknownSessionError,
    );
  });
});
