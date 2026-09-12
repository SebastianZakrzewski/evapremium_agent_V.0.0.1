import type { ChatAgent } from './chat-agent.port';
import { InMemoryChatSessions } from './chat-session';
import type { ChatSseFrame } from './sse';

export async function* streamChatMessage(
  sessions: InMemoryChatSessions,
  agent: ChatAgent,
  sessionId: string,
  message: string,
): AsyncGenerator<ChatSseFrame> {
  sessions.assertExists(sessionId);
  sessions.appendMessage({ sessionId, role: 'user', body: message });

  if (agent.stream) {
    let text = '';
    for await (const chunk of agent.stream(message)) {
      if (!chunk) {
        continue;
      }
      text += chunk;
      yield { event: 'delta', data: { text: chunk } };
    }
    const turn = { text, data: { status: 'generated' } };
    sessions.appendMessage({ sessionId, role: 'assistant', body: turn.text });
    yield { event: 'done', data: { sessionId, ...turn } };
    return;
  }

  const turn = await agent.handle(message);
  sessions.appendMessage({ sessionId, role: 'assistant', body: turn.text });
  yield { event: 'done', data: { sessionId, ...turn } };
}
