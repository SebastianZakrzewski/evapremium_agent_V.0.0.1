import type { ChatApi, ChatTurn } from './chat-api';

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
    async postMessage(sessionId: string, message: string) {
      const response = await fetch(`${root}/v1/sessions/${sessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      if (!response.ok) {
        throw new Error('message_post_failed');
      }
      return (await response.json()) as ChatTurn;
    },
  };
}
