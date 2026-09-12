import { InMemoryChatSessions } from './chat-session';
import type { ChatAgent, ChatAgentTurn } from './chat-agent.port';
import { streamChatMessage } from './stream-chat-message';

class StreamingAgent implements ChatAgent {
  handle(): Promise<ChatAgentTurn> {
    return Promise.resolve({ text: 'ab', data: { status: 'generated' } });
  }

  async *stream() {
    yield 'a';
    yield 'b';
  }
}

async function collect(
  sessions: InMemoryChatSessions,
  agent: ChatAgent,
  sessionId: string,
  message: string,
) {
  const frames = [];
  for await (const frame of streamChatMessage(
    sessions,
    agent,
    sessionId,
    message,
  )) {
    frames.push(frame);
  }
  return frames;
}

describe('streamChatMessage', () => {
  it('emits token deltas then done for a streaming agent', async () => {
    const sessions = new InMemoryChatSessions(() => 'session-sse');
    const { sessionId } = await sessions.create();
    const frames = await collect(
      sessions,
      new StreamingAgent(),
      sessionId,
      'golf 8 komplet',
    );
    expect(frames).toEqual([
      { event: 'delta', data: { text: 'a' } },
      { event: 'delta', data: { text: 'b' } },
      {
        event: 'done',
        data: {
          sessionId: 'session-sse',
          text: 'ab',
          data: { status: 'generated' },
        },
      },
    ]);
    expect((await sessions.listMessages(sessionId)).map((row) => row.body)).toEqual([
      'golf 8 komplet',
      'ab',
    ]);
  });
});
