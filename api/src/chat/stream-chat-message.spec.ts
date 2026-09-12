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

class RecordingSessionAgent implements ChatAgent {
  readonly sessionIds: Array<string | undefined> = [];

  handle(): Promise<ChatAgentTurn> {
    return Promise.resolve({ text: 'x', data: { status: 'generated' } });
  }

  async *stream(_message: string, sessionId?: string) {
    this.sessionIds.push(sessionId);
    yield 'x';
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

  it('passes sessionId into the streaming agent', async () => {
    const sessions = new InMemoryChatSessions(() => 'session-intent');
    const { sessionId } = await sessions.create();
    const agent = new RecordingSessionAgent();
    await collect(sessions, agent, sessionId, 'kolejna wiadomosc');
    expect(agent.sessionIds).toEqual(['session-intent']);
  });
});
