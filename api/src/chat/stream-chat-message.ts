import type { ChatAgent } from './chat-agent.port';
import type { ChatSessions } from './chat-session';
import type { ChatSseFrame } from './sse';

export async function* streamChatMessage(
  sessions: ChatSessions,
  agent: ChatAgent,
  sessionId: string,
  message: string,
): AsyncGenerator<ChatSseFrame> {
  await sessions.assertExists(sessionId);
  await sessions.appendMessage({ sessionId, role: 'user', body: message });

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
    await sessions.appendMessage({ sessionId, role: 'assistant', body: turn.text });
    yield { event: 'done', data: { sessionId, ...turn } };
    return;
  }

  const turn = await agent.handle(message);
  await sessions.appendMessage({ sessionId, role: 'assistant', body: turn.text });
  yield { event: 'done', data: { sessionId, ...turn } };
}
