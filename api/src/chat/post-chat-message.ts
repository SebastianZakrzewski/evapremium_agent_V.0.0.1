import type { ChatAgent, ChatAgentTurn } from './chat-agent.port';
import type { ChatSessions } from './chat-session';

export async function postChatMessage(
  sessions: ChatSessions,
  agent: ChatAgent,
  sessionId: string,
  message: string,
): Promise<{ sessionId: string } & ChatAgentTurn> {
  await sessions.assertExists(sessionId);
  await sessions.appendMessage({ sessionId, role: 'user', body: message });
  const turn = await agent.handle(message);
  await sessions.appendMessage({ sessionId, role: 'assistant', body: turn.text });
  return { sessionId, ...turn };
}
