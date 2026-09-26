import type { ReactNode } from 'react';
import type { AnalyticsDay } from './dashboard-api';

const reasonLabels: Record<string, string> = {
  no_search: 'Brak search',
  second_search: 'Drugi search',
  no_lookup: 'Brak lookupu',
  lookup_outside: 'Slug spoza rankingu',
  lookup_not_top: 'Lookup nie jest pierwszy',
  lookup_without_search: 'Lookup bez searcha',
  tool_out_of_profile: 'Narzędzie poza profilem',
  missing_tool: 'Brak oczekiwanego narzędzia',
};

function reasonLabel(code: string): string {
  return reasonLabels[code] ?? code;
}

function sessionHref(sessionId: string): string {
  return `#/sessions/${encodeURIComponent(sessionId)}`;
}

function sharePercent(part: number, total: number): number {
  if (total <= 0) {
    return 0;
  }
  return Math.round((part / total) * 100);
}

function ShareBar({
  label,
  part,
  total,
  detail,
}: {
  label: string;
  part: number;
  total: number;
  detail: string;
}) {
  const width = sharePercent(part, total);
  return (
    <div className="share-row">
      <div className="share-caption">
        <span>{label}</span>
        <span>{detail}</span>
      </div>
      <div
        className="share-track"
        role="img"
        aria-label={`${label}: ${detail}`}
      >
        <div className="share-fill" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

export function AnalyticsView({
  date,
  onDateChange,
  analytics,
  loading,
  error,
  onSignOut,
  navigation,
}: {
  date: string;
  onDateChange: (date: string) => void;
  analytics: AnalyticsDay | null;
  loading: boolean;
  error: string | null;
  onSignOut: () => void;
  navigation: ReactNode;
}) {
  const maxReason = analytics?.reasons.reduce(
    (max, row) => Math.max(max, row.count),
    0,
  ) ?? 0;

  return (
    <main className="dashboard-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">EVA Premium · Agent</p>
          <h1>Analityka</h1>
          {navigation}
        </div>
        <div className="topbar-actions">
          <label htmlFor="analytics-date">Data</label>
          <input
            id="analytics-date"
            type="date"
            value={date}
            onChange={(event) => onDateChange(event.target.value)}
          />
          <button className="text-button" type="button" onClick={onSignOut}>
            Zmień token
          </button>
        </div>
      </header>

      <section className="intro">
        <p>
          Werdykt tury: model dobrał retrieval z rankingu albo właściwe
          narzędzie. Liczba tur jest obok udziału, żeby mała próbka nie
          wyglądała jak pewność.
        </p>
      </section>

      {loading && <p className="status">Pobieram analitykę…</p>}
      {error && (
        <p className="status status-error" role="alert">
          {error}
        </p>
      )}

      {analytics && analytics.turns === 0 && (
        <p className="empty-state">Brak ocenionych tur w tej dobie.</p>
      )}

      {analytics && analytics.turns > 0 && (
        <>
          <section className="analytics-panel" aria-label="Skuteczność doby">
            <p className="section-kicker">Skuteczność</p>
            <h2>
              {analytics.pass} z {analytics.turns}
            </h2>
            <ShareBar
              label="Tury pass"
              part={analytics.pass}
              total={analytics.turns}
              detail={`${analytics.pass} pass · ${analytics.fail} fail`}
            />
          </section>

          <section className="analytics-panel" aria-label="Retrieval i akcja">
            <p className="section-kicker">Wymiary</p>
            <h2>Retrieval i akcja</h2>
            <ShareBar
              label="Retrieval"
              part={analytics.retrieval.pass}
              total={analytics.retrieval.pass + analytics.retrieval.fail}
              detail={`${analytics.retrieval.pass} pass · ${analytics.retrieval.fail} fail · ${analytics.retrieval.skipped} pominięte`}
            />
            <ShareBar
              label="Akcja"
              part={analytics.action.pass}
              total={analytics.action.pass + analytics.action.fail}
              detail={`${analytics.action.pass} pass · ${analytics.action.fail} fail · ${analytics.action.skipped} pominięte`}
            />
          </section>

          <section className="analytics-panel" aria-label="Powody porażki">
            <p className="section-kicker">Powody</p>
            <h2>Dlaczego fail</h2>
            {analytics.reasons.length === 0 ? (
              <p className="empty-state">Brak kodów porażki.</p>
            ) : (
              analytics.reasons.map((reason) => (
                <ShareBar
                  key={reason.code}
                  label={reasonLabel(reason.code)}
                  part={reason.count}
                  total={maxReason}
                  detail={String(reason.count)}
                />
              ))
            )}
          </section>

          <section className="analytics-panel" aria-label="Intencje">
            <p className="section-kicker">Intencje</p>
            <h2>Rozbicie</h2>
            <ul className="intent-breakdown">
              {analytics.byIntent.map((row) => (
                <li key={row.intent}>
                  <span>{row.intent}</span>
                  <strong>
                    {row.pass} / {row.turns}
                  </strong>
                </li>
              ))}
            </ul>
          </section>

          <section className="violations" aria-labelledby="analytics-failures">
            <div>
              <p className="section-kicker">Zejście</p>
              <h2 id="analytics-failures">Porażki</h2>
            </div>
            {analytics.failures.length === 0 ? (
              <p className="empty-state">Brak porażek w tej dobie.</p>
            ) : (
              <ul>
                {analytics.failures.map((failure) => (
                  <li key={`${failure.sessionId}:${failure.occurredAt}`}>
                    <a href={sessionHref(failure.sessionId)}>
                      {failure.sessionId}
                    </a>
                    <strong>
                      {failure.intent}
                      {failure.codes.length > 0
                        ? ` · ${failure.codes.map(reasonLabel).join(', ')}`
                        : ''}
                    </strong>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  );
}
