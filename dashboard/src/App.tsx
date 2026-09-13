import { FormEvent, useEffect, useState } from 'react';
import {
  fetchDaySummary,
  fetchSession,
  fetchSessions,
  type DaySummary,
  type SessionDetails,
  type SessionEvent,
  type SessionListItem,
  type SessionMarker,
} from './dashboard-api';
import './App.css';

const TOKEN_STORAGE_KEY = 'eva-dashboard-token';

interface AppProps {
  initialDate?: string;
}

type DashboardView =
  | { kind: 'overview' }
  | { kind: 'sessions' }
  | { kind: 'session'; sessionId: string };

const markerLabels: Record<SessionMarker, string> = {
  intent: 'Intencja',
  cascade: 'Kaskada',
  quote: 'Wycena',
  tree: 'Drzewo',
  lead: 'Lead',
  violation: 'Naruszenie',
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function readView(): DashboardView {
  const path = window.location.hash.replace(/^#/, '');
  if (path.startsWith('/sessions/')) {
    try {
      return {
        kind: 'session',
        sessionId: decodeURIComponent(path.slice('/sessions/'.length)),
      };
    } catch {
      return { kind: 'sessions' };
    }
  }
  return path === '/sessions' ? { kind: 'sessions' } : { kind: 'overview' };
}

function sessionHref(sessionId: string): string {
  return `#/sessions/${encodeURIComponent(sessionId)}`;
}

function violationLabel(count: number): string {
  if (count === 1) {
    return 'naruszenie';
  }
  if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 12 || count % 100 > 14)) {
    return 'naruszenia';
  }
  return 'naruszeń';
}

function requestError(reason: unknown, fallback: string): string {
  return reason instanceof Error ? reason.message : fallback;
}

function TokenGate({ onSubmit }: { onSubmit: (token: string) => void }) {
  const [value, setValue] = useState('');

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = value.trim();
    if (token) {
      sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
      onSubmit(token);
    }
  }

  return (
    <main className="gate-shell">
      <section className="gate-card" aria-labelledby="gate-title">
        <div className="brand-mark" aria-hidden="true">
          E
        </div>
        <p className="eyebrow">EVA Premium</p>
        <h1 id="gate-title">Panel operatora</h1>
        <p className="gate-copy">
          Wpisz token dashboardu, aby zobaczyć bieżące podsumowanie pracy agenta.
          Token pozostanie tylko w tej sesji przeglądarki.
        </p>
        <form onSubmit={submit}>
          <label htmlFor="dashboard-token">Token dostępu</label>
          <input
            id="dashboard-token"
            type="password"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            autoComplete="off"
            placeholder="Wklej DASHBOARD_TOKEN"
            required
            autoFocus
          />
          <button type="submit">Otwórz panel</button>
        </form>
      </section>
    </main>
  );
}

function PageNavigation({ current }: { current: 'overview' | 'sessions' }) {
  return (
    <nav className="page-navigation" aria-label="Widoki dashboardu">
      <a className={current === 'overview' ? 'active' : ''} href="#/">
        Przegląd
      </a>
      <a className={current === 'sessions' ? 'active' : ''} href="#/sessions">
        Sesje
      </a>
    </nav>
  );
}

function MetricCard({
  title,
  value,
  detail,
}: {
  title: string;
  value: number;
  detail: string;
}) {
  return (
    <article className="metric-card">
      <p>{title}</p>
      <strong>{value}</strong>
      <span>{detail}</span>
    </article>
  );
}

function Overview({
  date,
  onDateChange,
  summary,
  loading,
  error,
  onSignOut,
}: {
  date: string;
  onDateChange: (date: string) => void;
  summary: DaySummary | null;
  loading: boolean;
  error: string | null;
  onSignOut: () => void;
}) {
  return (
    <main className="dashboard-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">EVA Premium · Agent</p>
          <h1>Przegląd doby</h1>
          <PageNavigation current="overview" />
        </div>
        <div className="topbar-actions">
          <label htmlFor="summary-date">Data</label>
          <input
            id="summary-date"
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
        <p>Najważniejsze sygnały z pracy agenta w wybranym dniu.</p>
      </section>

      {loading && <p className="status">Pobieram podsumowanie…</p>}
      {error && (
        <p className="status status-error" role="alert">
          {error}
        </p>
      )}

      {summary && (
        <>
          <section className="metrics" aria-label="Cztery hipotezy agenta">
            <MetricCard
              title="Odciążenie"
              value={summary.relief.sessions}
              detail="sesji zakończonych bez leada"
            />
            <MetricCard
              title="Wycena"
              value={summary.quote.issued}
              detail={`${summary.quote.issued} wydanych · ${summary.quote.violations} ${violationLabel(summary.quote.violations)}`}
            />
            <MetricCard
              title="Prawda"
              value={summary.truth.hits}
              detail={`${summary.truth.hits} trafień · ${summary.truth.misses} braki`}
            />
            <MetricCard
              title="Lead"
              value={summary.lead.created}
              detail={`${summary.lead.created} utworzone · ${summary.lead.skipped} pominięte`}
            />
          </section>

          <section className="violations" aria-labelledby="violations-title">
            <div>
              <p className="section-kicker">Kontrola reguł</p>
              <h2 id="violations-title">Naruszenia</h2>
            </div>
            {summary.violations.length === 0 ? (
              <p className="empty-state">Brak naruszeń w tej dobie.</p>
            ) : (
              <ul>
                {summary.violations.map((violation) => (
                  <li key={`${violation.sessionId}:${violation.reason}`}>
                    <a href={sessionHref(violation.sessionId)}>
                      {violation.sessionId}
                    </a>
                    <strong>{violation.reason}</strong>
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

function Sessions({
  date,
  onDateChange,
  token,
  onSignOut,
}: {
  date: string;
  onDateChange: (date: string) => void;
  token: string;
  onSignOut: () => void;
}) {
  const [marker, setMarker] = useState<SessionMarker | ''>('');
  const [sessions, setSessions] = useState<SessionListItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setSessions(null);
    fetchSessions(date, marker, token, controller.signal)
      .then(setSessions)
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setError(requestError(reason, 'Nie udało się pobrać listy sesji.'));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [date, marker, token]);

  return (
    <main className="dashboard-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">EVA Premium · Agent</p>
          <h1>Sesje</h1>
          <PageNavigation current="sessions" />
        </div>
        <div className="topbar-actions filter-actions">
          <label htmlFor="sessions-date">Data</label>
          <input
            id="sessions-date"
            type="date"
            value={date}
            onChange={(event) => onDateChange(event.target.value)}
          />
          <label htmlFor="session-marker">Wymiar</label>
          <select
            id="session-marker"
            value={marker}
            onChange={(event) =>
              setMarker(event.target.value as SessionMarker | '')
            }
          >
            <option value="">Wszystkie</option>
            {Object.entries(markerLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <button className="text-button" type="button" onClick={onSignOut}>
            Zmień token
          </button>
        </div>
      </header>

      <section className="intro">
        <p>Znaczniki sesji pochodzą ze zdarzeń domenowych zapisanych przez API.</p>
      </section>

      {loading && <p className="status">Pobieram sesje…</p>}
      {error && (
        <p className="status status-error" role="alert">
          {error}
        </p>
      )}
      {sessions && sessions.length === 0 && (
        <p className="empty-state">Brak sesji dla wybranych filtrów.</p>
      )}
      {sessions && sessions.length > 0 && (
        <ul className="session-list" aria-label="Lista sesji">
          {sessions.map((session) => (
            <li key={session.sessionId}>
              <a className="session-link" href={sessionHref(session.sessionId)}>
                <span>{session.sessionId}</span>
                <span className="marker-list">
                  {session.markers.map((sessionMarker) => (
                    <span
                      className={`marker marker-${sessionMarker}`}
                      key={sessionMarker}
                    >
                      {markerLabels[sessionMarker]}
                    </span>
                  ))}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function eventLabel(type: SessionEvent['type']): string {
  const labels: Record<SessionEvent['type'], string> = {
    intent_accepted: 'Zaakceptowano intencję',
    cascade_resolved: 'Rozstrzygnięto kaskadę',
    quote_issued: 'Wydano wycenę',
    context_hit: 'Trafienie w drzewie',
    context_miss: 'Brak w drzewie',
    lead_attempted: 'Próba utworzenia leada',
    tool_failed: 'Błąd narzędzia',
  };
  return labels[type];
}

function eventDetail(event: SessionEvent): string | null {
  switch (event.type) {
    case 'intent_accepted':
      return typeof event.payload.intent === 'string'
        ? event.payload.intent
        : null;
    case 'cascade_resolved':
      return typeof event.payload.match === 'string' ? event.payload.match : null;
    case 'context_hit':
    case 'context_miss':
      return typeof event.payload.slug === 'string' ? event.payload.slug : null;
    case 'lead_attempted':
      return typeof event.payload.outcome === 'string'
        ? event.payload.outcome
        : null;
    case 'tool_failed':
      return typeof event.payload.tool === 'string' ? event.payload.tool : null;
    case 'quote_issued':
      return null;
  }
}

function quoteAmount(event: SessionEvent): string | null {
  if (event.type !== 'quote_issued' || typeof event.payload.amount !== 'number') {
    return null;
  }
  const currency =
    typeof event.payload.currency === 'string' ? event.payload.currency : '';
  return `${event.payload.amount} ${currency}`.trim();
}

function SessionView({
  sessionId,
  token,
  onSignOut,
}: {
  sessionId: string;
  token: string;
  onSignOut: () => void;
}) {
  const [session, setSession] = useState<SessionDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setSession(null);
    fetchSession(sessionId, token, controller.signal)
      .then((result) => ({
        ...result,
        events: [...result.events].sort((a, b) =>
          a.occurredAt.localeCompare(b.occurredAt),
        ),
      }))
      .then(setSession)
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setError(requestError(reason, 'Nie udało się pobrać sesji.'));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [sessionId, token]);

  return (
    <main className="dashboard-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">EVA Premium · Agent</p>
          <h1>Sesja {sessionId}</h1>
          <PageNavigation current="sessions" />
        </div>
        <div className="topbar-actions">
          <a className="back-link" href="#/sessions">
            Wróć do listy
          </a>
          <button className="text-button" type="button" onClick={onSignOut}>
            Zmień token
          </button>
        </div>
      </header>

      {loading && <p className="status">Pobieram sesję…</p>}
      {error && (
        <p className="status status-error" role="alert">
          {error}
        </p>
      )}
      {session && (
        <div className="session-detail">
          <section aria-labelledby="transcript-title">
            <p className="section-kicker">Rozmowa</p>
            <h2 id="transcript-title">Transkrypt</h2>
            <div className="transcript">
              {session.messages.map((message, index) => (
                <article
                  className={`message message-${message.direction}`}
                  key={`${message.direction}:${index}`}
                >
                  <span>
                    {message.direction === 'inbound' ? 'Klient' : 'Eva'}
                  </span>
                  <p>{message.text}</p>
                </article>
              ))}
            </div>
          </section>

          <section aria-labelledby="timeline-title">
            <p className="section-kicker">Fakty z Nest</p>
            <h2 id="timeline-title">Oś zdarzeń</h2>
            <ol className="event-timeline">
              {session.events.map((event) => {
                const detail = eventDetail(event);
                const amount = quoteAmount(event);
                return (
                  <li data-testid="timeline-event" key={event.id}>
                    <time dateTime={event.occurredAt}>
                      {new Date(event.occurredAt).toLocaleString('pl-PL')}
                    </time>
                    <strong>{eventLabel(event.type)}</strong>
                    {detail && <span>{detail}</span>}
                    {amount && <span className="event-amount">{amount}</span>}
                  </li>
                );
              })}
            </ol>
          </section>
        </div>
      )}
    </main>
  );
}

export function App({ initialDate = today() }: AppProps) {
  const storedToken = sessionStorage.getItem(TOKEN_STORAGE_KEY);
  const [token, setToken] = useState(storedToken ?? '');
  const [date, setDate] = useState(initialDate);
  const [view, setView] = useState<DashboardView>(readView);
  const [summary, setSummary] = useState<DaySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onHashChange() {
      setView(readView());
    }
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    if (!token || view.kind !== 'overview') {
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setSummary(null);
    fetchDaySummary(date, token, controller.signal)
      .then(setSummary)
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setError(
            reason instanceof Error
              ? reason.message
              : 'Nie udało się pobrać podsumowania.',
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [date, token, view.kind]);

  function signOut() {
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken('');
    setSummary(null);
    setError(null);
  }

  if (!token) {
    return <TokenGate onSubmit={setToken} />;
  }

  if (view.kind === 'sessions') {
    return (
      <Sessions
        date={date}
        onDateChange={setDate}
        token={token}
        onSignOut={signOut}
      />
    );
  }

  if (view.kind === 'session') {
    return (
      <SessionView
        sessionId={view.sessionId}
        token={token}
        onSignOut={signOut}
      />
    );
  }

  return (
    <Overview
      date={date}
      onDateChange={setDate}
      summary={summary}
      loading={loading}
      error={error}
      onSignOut={signOut}
    />
  );
}
