export interface DaySummary {
  date: string;
  relief: { sessions: number };
  quote: { issued: number; violations: number };
  truth: { hits: number; misses: number };
  lead: { created: number; skipped: number };
  violations: Array<{ sessionId: string; reason: string }>;
}

export type SessionMarker =
  | 'intent'
  | 'cascade'
  | 'quote'
  | 'tree'
  | 'lead'
  | 'violation';

export interface SessionListItem {
  sessionId: string;
  markers: SessionMarker[];
}

export interface SessionMessage {
  direction: 'inbound' | 'outbound';
  text: string;
}

export interface SessionEvent {
  id: string;
  sessionId: string;
  occurredAt: string;
  type:
    | 'intent_accepted'
    | 'cascade_resolved'
    | 'quote_issued'
    | 'context_hit'
    | 'context_miss'
    | 'context_search'
    | 'lead_attempted'
    | 'tool_failed';
  payload: Record<string, unknown>;
}

export interface SessionDetails {
  sessionId: string;
  messages: SessionMessage[];
  events: SessionEvent[];
}

export interface ContextGraphNode {
  slug: string;
  title: string;
  x: number;
  y: number;
}

export interface ContextGraphEdge {
  source: string;
  target: string;
  similarity: number;
}

export interface ContextGraph {
  nodes: ContextGraphNode[];
  edges: ContextGraphEdge[];
}

function apiUrl(path: string): string {
  const baseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '');
  return `${baseUrl}${path}`;
}

async function dashboardFetch<T>(
  path: string,
  token: string,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(apiUrl(path), {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });

  if (!response.ok) {
    throw new Error(
      response.status === 401
        ? 'Token został odrzucony. Sprawdź go i spróbuj ponownie.'
        : 'Nie udało się pobrać danych dashboardu. Spróbuj ponownie.',
    );
  }

  return (await response.json()) as T;
}

export async function fetchDaySummary(
  date: string,
  token: string,
  signal?: AbortSignal,
): Promise<DaySummary> {
  return dashboardFetch<DaySummary>(
    `/v1/dashboard/summary?date=${encodeURIComponent(date)}`,
    token,
    signal,
  );
}

export async function fetchSessions(
  date: string,
  marker: SessionMarker | '',
  token: string,
  signal?: AbortSignal,
): Promise<SessionListItem[]> {
  const markerQuery = marker ? `&marker=${encodeURIComponent(marker)}` : '';
  return dashboardFetch<SessionListItem[]>(
    `/v1/dashboard/sessions?date=${encodeURIComponent(date)}${markerQuery}`,
    token,
    signal,
  );
}

export async function fetchSession(
  sessionId: string,
  token: string,
  signal?: AbortSignal,
): Promise<SessionDetails> {
  return dashboardFetch<SessionDetails>(
    `/v1/dashboard/sessions/${encodeURIComponent(sessionId)}`,
    token,
    signal,
  );
}

export async function fetchContextGraph(
  token: string,
  signal?: AbortSignal,
): Promise<ContextGraph> {
  return dashboardFetch<ContextGraph>('/v1/dashboard/context-graph', token, signal);
}

export async function fetchContextActivity(
  since: string | undefined,
  token: string,
  signal?: AbortSignal,
): Promise<SessionEvent[]> {
  const sinceQuery =
    since === undefined ? '' : `?since=${encodeURIComponent(since)}`;
  return dashboardFetch<SessionEvent[]>(
    `/v1/dashboard/context-activity${sinceQuery}`,
    token,
    signal,
  );
}
