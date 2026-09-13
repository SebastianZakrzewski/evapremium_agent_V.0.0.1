export interface DaySummary {
  date: string;
  relief: { sessions: number };
  quote: { issued: number; violations: number };
  truth: { hits: number; misses: number };
  lead: { created: number; skipped: number };
  violations: Array<{ sessionId: string; reason: string }>;
}

function summaryUrl(date: string): string {
  const baseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '');
  return `${baseUrl}/v1/dashboard/summary?date=${encodeURIComponent(date)}`;
}

export async function fetchDaySummary(
  date: string,
  token: string,
  signal?: AbortSignal,
): Promise<DaySummary> {
  const response = await fetch(summaryUrl(date), {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });

  if (!response.ok) {
    throw new Error(
      response.status === 401
        ? 'Token został odrzucony. Sprawdź go i spróbuj ponownie.'
        : 'Nie udało się pobrać podsumowania. Spróbuj ponownie.',
    );
  }

  return (await response.json()) as DaySummary;
}
