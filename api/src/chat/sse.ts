export type ChatSseFrame =
  | { event: 'delta'; data: { text: string } }
  | { event: 'done'; data: { sessionId: string; text: string; data: unknown } }
  | { event: 'error'; data: { message: string } };

export function encodeSse(frame: ChatSseFrame): string {
  return `event: ${frame.event}\ndata: ${JSON.stringify(frame.data)}\n\n`;
}
