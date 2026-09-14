import { MastraChatAgent } from '@api/chat/mastra-chat.agent';
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
});
