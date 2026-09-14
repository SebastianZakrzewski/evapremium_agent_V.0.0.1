import { encodeSse } from '@api/chat/sse';

describe('encodeSse', () => {
  it('encodes a text delta frame for the widget stream', () => {
    expect(encodeSse({ event: 'delta', data: { text: 'Komplet' } })).toBe(
      'event: delta\ndata: {"text":"Komplet"}\n\n',
    );
  });

  it('encodes a done frame with Nest payload', () => {
    expect(
      encodeSse({
        event: 'done',
        data: {
          sessionId: 's1',
          text: 'quoted',
          data: { status: 'quoted', amount: 599 },
        },
      }),
    ).toBe(
      'event: done\ndata: {"sessionId":"s1","text":"quoted","data":{"status":"quoted","amount":599}}\n\n',
    );
  });
});
