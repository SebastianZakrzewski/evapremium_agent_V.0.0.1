import { AsyncLocalStorage } from 'node:async_hooks';

type TurnSession = { sessionId: string };

const turnSession = new AsyncLocalStorage<TurnSession>();

export function runWithTurnSession<T>(sessionId: string, fn: () => T): T {
  return turnSession.run({ sessionId }, fn);
}

export function currentTurnSessionId(): string | undefined {
  return turnSession.getStore()?.sessionId;
}

export async function* withTurnSession<T>(
  sessionId: string | undefined,
  gen: AsyncIterable<T>,
): AsyncGenerator<T> {
  if (!sessionId) {
    yield* gen;
    return;
  }
  const iterator = gen[Symbol.asyncIterator]();
  for (;;) {
    const step = await runWithTurnSession(sessionId, () => iterator.next());
    if (step.done) {
      return;
    }
    yield step.value;
  }
}
