import { describe, expect, it, vi } from 'vitest';
import { consumeChatSse, parseSsePart } from '@widget/chat/consume-chat-sse';

describe('consumeChatSse', () => {
  it('parses a delta part into token text', () => {
    expect(parseSsePart('event: delta\ndata: {"text":"Komplet"}')).toEqual({
      event: 'delta',
      data: { text: 'Komplet' },
    });
  });

  it('calls onDelta for tokens and returns the done payload', async () => {
    const body = [
      'event: delta\ndata: {"text":"Komplet "}\n\n',
      'event: delta\ndata: {"text":"dywaników"}\n\n',
      'event: done\ndata: {"sessionId":"s1","text":"Komplet dywaników","data":{"status":"generated"}}\n\n',
    ].join('');
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(body));
        controller.close();
      },
    });
    const response = new Response(stream, { status: 200 });
    const onDelta = vi.fn();
    await expect(consumeChatSse(response, onDelta)).resolves.toEqual({
      sessionId: 's1',
      text: 'Komplet dywaników',
      data: { status: 'generated' },
    });
    expect(onDelta.mock.calls.map((call) => call[0])).toEqual([
      'Komplet ',
      'dywaników',
    ]);
  });
});
