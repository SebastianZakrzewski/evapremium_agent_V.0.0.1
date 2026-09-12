import type { ChatApi, ChatTurn } from './chat-api';
import { consumeChatSse } from './consume-chat-sse';

export function createHttpChatApi(baseUrl: string): ChatApi {
  const root = baseUrl.replace(/\/$/, '');

  return {
    async createSession() {
      const response = await fetch(`${root}/v1/sessions`, { method: 'POST' });
      if (!response.ok) {
        throw new Error('session_create_failed');
      }
      return (await response.json()) as { sessionId: string };
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
      return (await consumeChatSse(response, onDelta)) as ChatTurn;
    },
  };
}
