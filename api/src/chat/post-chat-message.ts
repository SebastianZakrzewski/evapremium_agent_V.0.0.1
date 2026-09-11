import type { ChatAgent, ChatAgentTurn } from './chat-agent.port';
import { InMemoryChatSessions } from './chat-session';

export async function postChatMessage(
  sessions: InMemoryChatSessions,
  agent: ChatAgent,
  sessionId: string,
  message: string,
): Promise<{ sessionId: string } & ChatAgentTurn> {
  sessions.assertExists(sessionId);
  sessions.appendMessage({ sessionId, role: 'user', body: message });
  const turn = await agent.handle(message);
  sessions.appendMessage({ sessionId, role: 'assistant', body: turn.text });
  return { sessionId, ...turn };
}
