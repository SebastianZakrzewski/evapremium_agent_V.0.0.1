import { InMemoryChatSessions } from '@api/chat/chat-session';
import {
  persistOpenedChatSession,
  SESSION_OPENER_GREETING,
  SESSION_OPENER_SUGGESTIONS,
} from '@api/chat/session-opener';
import { StubIntentQualifier } from '@api/mastra/intents/stub-intent-qualifier';

describe('session opener', () => {
  it('persists a deterministic greeting and returns five shop chips', async () => {
    const sessions = new InMemoryChatSessions(() => 'session-open');
    const created = await persistOpenedChatSession(sessions);
    expect(created).toEqual({
      sessionId: 'session-open',
      greeting: SESSION_OPENER_GREETING,
      suggestions: SESSION_OPENER_SUGGESTIONS,
    });
    expect(created.suggestions).toHaveLength(5);
    expect(await sessions.listMessages('session-open')).toEqual([
      {
        sessionId: 'session-open',
        role: 'assistant',
        body: SESSION_OPENER_GREETING,
      },
    ]);
  });

  it('maps each chip message to a shop intent without out_of_scope', async () => {
    const qualifier = new StubIntentQualifier();
    const expected = [
      'product_info',
      'pricing',
      'product_info',
      'delivery',
      'after_sales',
    ] as const;
    for (const [index, chip] of SESSION_OPENER_SUGGESTIONS.entries()) {
      const result = await qualifier.qualify(chip.message);
      expect(result.intent).toBe(expected[index]);
    }
  });
});
