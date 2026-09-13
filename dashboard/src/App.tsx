import { FormEvent, useEffect, useState } from 'react';
import { fetchDaySummary, type DaySummary } from './dashboard-api';
import './App.css';

const TOKEN_STORAGE_KEY = 'eva-dashboard-token';

interface AppProps {
  initialDate?: string;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
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
                    <span>{violation.sessionId}</span>
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

export function App({ initialDate = today() }: AppProps) {
  const storedToken = sessionStorage.getItem(TOKEN_STORAGE_KEY);
  const [token, setToken] = useState(storedToken ?? '');
  const [date, setDate] = useState(initialDate);
  const [summary, setSummary] = useState<DaySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
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
  }, [date, token]);

  function signOut() {
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken('');
    setSummary(null);
    setError(null);
  }

  if (!token) {
    return <TokenGate onSubmit={setToken} />;
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
