export type ContextTurnEvent = {
  id: string;
  sessionId: string;
  occurredAt: string;
  type: string;
  payload: Record<string, unknown>;
};

export type ContextTurnFrame = {
  sessionId: string;
  candidates: string[];
  hits: string[];
  misses: string[];
  path: string[];
};

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(
    (item): item is string => typeof item === 'string' && item.length > 0,
  );
}

function slugOf(payload: Record<string, unknown>): string | null {
  return typeof payload.slug === 'string' && payload.slug.length > 0
    ? payload.slug
    : null;
}

export function contextTurnFrames(events: ContextTurnEvent[]): ContextTurnFrame[] {
  const ordered = [...events].sort(
    (left, right) =>
      left.occurredAt.localeCompare(right.occurredAt) ||
      left.id.localeCompare(right.id),
  );
  const frames: ContextTurnFrame[] = [];
  let current: ContextTurnFrame | null = null;

  for (const event of ordered) {
    if (event.type === 'context_search') {
      const candidates = stringList(event.payload.slugs);
      current = {
        sessionId: event.sessionId,
        candidates,
        hits: [],
        misses: [],
        path: [...candidates],
      };
      frames.push(current);
      continue;
    }
    if (event.type !== 'context_hit' && event.type !== 'context_miss') {
      continue;
    }
    const slug = slugOf(event.payload);
    if (slug === null) {
      continue;
    }
    if (current === null || current.sessionId !== event.sessionId) {
      current = {
        sessionId: event.sessionId,
        candidates: [],
        hits: [],
        misses: [],
        path: [],
      };
      frames.push(current);
    }
    if (event.type === 'context_hit') {
      current.hits.push(slug);
    } else {
      current.misses.push(slug);
    }
    current.path.push(slug);
  }

  return frames;
}

export function contextNodeState(
  slug: string,
  frame: ContextTurnFrame | null,
): 'idle' | 'candidate' | 'hit' | 'miss' {
  if (frame === null) {
    return 'idle';
  }
  if (frame.hits.includes(slug)) {
    return 'hit';
  }
  if (frame.misses.includes(slug)) {
    return 'miss';
  }
  if (frame.candidates.includes(slug)) {
    return 'candidate';
  }
  return 'idle';
}
