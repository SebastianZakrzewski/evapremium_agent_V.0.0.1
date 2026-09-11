import type { ChatAgent, ChatAgentTurn } from './chat-agent.port';
import { InMemoryChatSessions } from './chat-session';

export async function postChatMessage(
  sessions: InMemoryChatSessions,
  agent: ChatAgent,
  sessionId: string,
  message: string,
): Promise<{ sessionId: string } & ChatAgentTurn> {
  sessions.assertExists(sessionId);
  const turn = await agent.handle(message);
  return { sessionId, ...turn };
}
