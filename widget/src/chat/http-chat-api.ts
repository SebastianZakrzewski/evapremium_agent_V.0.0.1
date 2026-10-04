import type { ChatApi, CreatedSession, ChatTurn } from './chat-api';
import { consumeChatSse } from './consume-chat-sse';
import { throwIfTurnBudget } from './turn-budget';

export function createHttpChatApi(baseUrl: string): ChatApi {
  const root = baseUrl.replace(/\/$/, '');

  return {
    async createSession() {
      const response = await fetch(`${root}/v1/sessions`, { method: 'POST' });
      if (!response.ok) {
        await throwIfTurnBudget(response);
        throw new Error('session_create_failed');
      }
      return (await response.json()) as CreatedSession;
    },
    async postMessage(sessionId, message, onDelta) {
      const response = await fetch(`${root}/v1/sessions/${sessionId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({ message }),
      });
      await throwIfTurnBudget(response);
      return (await consumeChatSse(response, onDelta)) as ChatTurn;
    },
  };
}
