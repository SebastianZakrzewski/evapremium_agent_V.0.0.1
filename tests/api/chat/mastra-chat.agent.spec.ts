import { MastraChatAgent } from '@api/chat/mastra-chat.agent';
import { InMemorySessionClients } from '@api/chat/session-clients';
import { InMemoryIntentSessionState } from '@api/mastra/intents/intent-session-state';
import { StubIntentQualifier } from '@api/mastra/intents/stub-intent-qualifier';
import type { RequestContext } from '@mastra/core/request-context';

describe('MastraChatAgent request context', () => {
  it('reuses one agent and passes accepted intent in requestContext', async () => {
    let seen: { requestContext?: RequestContext<{ intent: string }> } | undefined;
    const stream = jest.fn(async (_message: string, options: typeof seen) => {
      seen = options;
      return {
        textStream: (async function* () {
          yield 'ok';
        })(),
      };
    });
    const agent = new MastraChatAgent(
      { stream } as never,
      new StubIntentQualifier(),
      new InMemoryIntentSessionState(),
    );

    const chunks: string[] = [];
    for await (const chunk of agent.stream(
      'Ile kosztują dywaniki do Golfa 8?',
      'session-1',
    )) {
      chunks.push(chunk);
    }

    expect(stream).toHaveBeenCalledTimes(1);
    expect(chunks).toEqual(['ok']);
    expect(seen?.requestContext?.get('intent')).toBe('pricing');
  });

  it('adds the stored car only on a turn that fits or prices the vehicle', async () => {
    const notes: Array<string | undefined> = [];
    const stream = jest.fn(async (_message: string, options: {
      requestContext?: RequestContext<Record<string, unknown>>;
    }) => {
      notes.push(options.requestContext?.get('executionNote') as string | undefined);
      return {
        textStream: (async function* () {
          yield 'ok';
        })(),
      };
    });
    const clients = new InMemorySessionClients();
    const agent = new MastraChatAgent(
      { stream } as never,
      new StubIntentQualifier(),
      new InMemoryIntentSessionState(),
      undefined,
      undefined,
      clients,
    );

    for await (const _chunk of agent.stream(
      'Czy pasują dywaniki do Toyota?',
      'session-1',
    )) {
      // drain
    }
    for await (const _chunk of agent.stream('Jakie macie kolory?', 'session-1')) {
      // drain
    }
    for await (const _chunk of agent.stream('Czy pasują dywaniki?', 'session-1')) {
      // drain
    }

    expect(notes[1] ?? '').not.toContain('marka=Toyota');
    expect(notes[2]).toContain('marka=Toyota');
    expect((await clients.get('session-1'))?.data.carBrand).toBe('Toyota');
  });
});
