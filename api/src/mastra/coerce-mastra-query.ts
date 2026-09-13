const ORDER_FIELDS = new Set(['createdAt', 'updatedAt']);

function sortDirection(raw: unknown): 'ASC' | 'DESC' {
  return raw === 'ASC' ? 'ASC' : 'DESC';
}

function fieldFromStudio(raw: string): 'createdAt' | 'updatedAt' {
  return ORDER_FIELDS.has(raw) ? (raw as 'createdAt' | 'updatedAt') : 'createdAt';
}

/**
 * Studio CLI serializes `orderBy` as a string (`createdAt` / JSON).
 * Nest Mastra validates an object `{ field, direction }`.
 */
export function coerceMastraOrderByQuery(
  query: Record<string, unknown>,
): void {
  const orderBy = query.orderBy;
  if (Array.isArray(orderBy)) {
    const first = orderBy[0];
    if (typeof first === 'string') {
      query.orderBy = first;
      coerceMastraOrderByQuery(query);
    }
    return;
  }
  if (typeof orderBy !== 'string') {
    return;
  }
  const trimmed = orderBy.trim();
  if (trimmed.startsWith('{')) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        query.orderBy = parsed;
        return;
      }
    } catch {
      // treat as a field name
    }
  }
  query.orderBy = {
    field: fieldFromStudio(trimmed),
    direction: sortDirection(query.sortDirection),
  };
}

/** Express 5 keeps `req.query` read-only; parse the raw query string instead. */
export function parseMastraQueryString(raw: string): Record<string, unknown> {
  const query: Record<string, unknown> = {};
  for (const [key, value] of new URLSearchParams(raw)) {
    const nested = key.match(/^([^[]+)\[([^\]]+)\]$/);
    if (nested) {
      const parent = nested[1];
      const child = nested[2];
      const current = query[parent];
      if (!current || typeof current !== 'object' || Array.isArray(current)) {
        query[parent] = { [child]: value };
      } else {
        (current as Record<string, string>)[child] = value;
      }
      continue;
    }
    query[key] = value;
  }
  coerceMastraOrderByQuery(query);
  return query;
}
