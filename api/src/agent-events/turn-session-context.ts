import { AsyncLocalStorage } from 'node:async_hooks';

type TurnSession = {
  sessionId: string;
  relatedBranches?: readonly string[];
};

const turnSession = new AsyncLocalStorage<TurnSession>();

export function runWithTurnSession<T>(
  sessionId: string,
  fn: () => T,
  relatedBranches?: readonly string[],
): T {
  return turnSession.run({ sessionId, relatedBranches }, fn);
}

export function currentTurnSessionId(): string | undefined {
  return turnSession.getStore()?.sessionId;
}

export function currentRelatedBranches(): readonly string[] {
  return turnSession.getStore()?.relatedBranches ?? [];
}

export async function* withTurnSession<T>(
  sessionId: string | undefined,
  gen: AsyncIterable<T>,
  relatedBranches?: readonly string[],
): AsyncGenerator<T> {
  if (!sessionId) {
    yield* gen;
    return;
  }
  const iterator = gen[Symbol.asyncIterator]();
  for (;;) {
    const step = await runWithTurnSession(
      sessionId,
      () => iterator.next(),
      relatedBranches,
    );
    if (step.done) {
      return;
    }
    yield step.value;
  }
}
