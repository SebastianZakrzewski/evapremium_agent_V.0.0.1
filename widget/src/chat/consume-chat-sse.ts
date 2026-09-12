import type { ChatTurn } from './chat-api';

export type SseFrame = {
  event: string;
  data: Record<string, unknown>;
};

export function parseSsePart(part: string): SseFrame | null {
  let event = 'message';
  const dataLines: string[] = [];
  for (const rawLine of part.split('\n')) {
    const line = rawLine.replace(/\r$/, '');
    if (line.startsWith('event:')) {
      event = line.slice('event:'.length).trim();
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice('data:'.length).trim());
    }
  }
  if (dataLines.length === 0) {
    return null;
  }
  return { event, data: JSON.parse(dataLines.join('')) as Record<string, unknown> };
}

export async function consumeChatSse(
  response: Response,
  onDelta?: (text: string) => void,
): Promise<ChatTurn> {
  if (!response.ok || !response.body) {
    throw new Error('message_post_failed');
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let doneTurn: ChatTurn | null = null;
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop() ?? '';
    for (const part of parts) {
      const frame = parseSsePart(part);
      if (!frame) {
        continue;
      }
      if (frame.event === 'delta' && typeof frame.data.text === 'string') {
        onDelta?.(frame.data.text);
      }
      if (frame.event === 'error') {
        throw new Error('message_post_failed');
      }
      if (frame.event === 'done') {
        doneTurn = frame.data as ChatTurn;
      }
    }
  }
  if (!doneTurn) {
    throw new Error('message_post_failed');
  }
  return doneTurn;
}
