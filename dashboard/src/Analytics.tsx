import type { ReactNode } from 'react';
import { MotionBar, MotionPie, type Theme } from 'motionchart';
import type { AnalyticsDay } from './dashboard-api';

const chartTheme: Theme = {
  name: 'eva',
  background: '#f7f7f4',
  gridColor: 'rgba(32, 33, 31, 0.08)',
  textColor: '#656760',
  colors: ['#2f6b4f', '#b42318', '#b9bbb4'],
  gradients: [],
  tooltipBackground: '#20211f',
  tooltipText: '#f7f7f4',
  tooltipBorder: 'transparent',
  glowColor: 'transparent',
};

const chartMotion = {
  animation: { disabled: true },
  hover: { enabled: false },
  theme: chartTheme,
  backgroundColor: '#f7f7f4',
} as const;

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
          <div className="chart-grid">
            <section className="analytics-panel" aria-label="Skuteczność doby">
              <p className="section-kicker">Skuteczność</p>
              <h2>
                {analytics.pass} z {analytics.turns}
              </h2>
              <div className="chart-frame">
                <MotionPie
                  {...chartMotion}
                  data={[
                    { label: 'Pass', value: analytics.pass, color: '#2f6b4f' },
                    { label: 'Fail', value: analytics.fail, color: '#b42318' },
                  ].filter((slice) => slice.value > 0)}
                  innerRadius={0.62}
                  centerLabel={`${analytics.pass} z ${analytics.turns}`}
                  centerSubLabel="pass"
                  padAngle={2}
                  legend
                  responsive={{ aspectRatio: 1 }}
                  height={280}
                  ariaLabel={`${analytics.pass} pass, ${analytics.fail} fail`}
                />
              </div>
            </section>

            <section className="analytics-panel" aria-label="Retrieval i akcja">
              <p className="section-kicker">Wymiary</p>
              <h2>Retrieval i akcja</h2>
              <div className="chart-frame">
                <MotionBar
                  {...chartMotion}
                  labels={['Retrieval', 'Akcja']}
                  series={[
                    {
                      label: 'Pass',
                      data: [analytics.retrieval.pass, analytics.action.pass],
                      color: '#2f6b4f',
                    },
                    {
                      label: 'Fail',
                      data: [analytics.retrieval.fail, analytics.action.fail],
                      color: '#b42318',
                    },
                    {
                      label: 'Pominięte',
                      data: [
                        analytics.retrieval.skipped,
                        analytics.action.skipped,
                      ],
                      color: '#b9bbb4',
                    },
                  ]}
                  legend={{ position: 'bottom', layout: 'horizontal' }}
                  showValues
                  borderRadius={4}
                  responsive
                  height={280}
                  ariaLabel="Pass, fail i pominięte dla retrieval oraz akcji"
                />
              </div>
            </section>
          </div>

          <section className="analytics-panel" aria-label="Powody porażki">
            <p className="section-kicker">Powody</p>
            <h2>Dlaczego fail</h2>
            {analytics.reasons.length === 0 ? (
              <p className="empty-state">Brak kodów porażki.</p>
            ) : (
              <>
              <div
                className="chart-frame"
                style={{ height: Math.max(220, analytics.reasons.length * 72) }}
              >
                <MotionBar
                  {...chartMotion}
                  orientation="horizontal"
                  color="#b42318"
                  data={analytics.reasons.map((reason) => ({
                    label: reasonLabel(reason.code),
                    value: reason.count,
                  }))}
                  showValues
                  borderRadius={4}
                  yTickCount={2}
                  yTickFormat={(value) =>
                    Number.isInteger(value) ? String(value) : ''
                  }
                  responsive
                  height={Math.max(220, analytics.reasons.length * 72)}
                  ariaLabel="Liczba porażek według powodu"
                />
              </div>
              <ul className="reason-readout">
                {analytics.reasons.map((reason) => (
                  <li key={reason.code}>
                    <span>{reasonLabel(reason.code)}</span>
                    <strong>{reason.count}</strong>
                  </li>
                ))}
              </ul>
              </>
            )}
          </section>

          <section className="analytics-panel" aria-label="Intencje">
            <p className="section-kicker">Intencje</p>
            <h2>Rozbicie</h2>
            <div className="chart-frame">
              <MotionBar
                {...chartMotion}
                labels={analytics.byIntent.map((row) => row.intent)}
                series={[
                  {
                    label: 'Pass',
                    data: analytics.byIntent.map((row) => row.pass),
                    color: '#2f6b4f',
                  },
                  {
                    label: 'Fail',
                    data: analytics.byIntent.map((row) => row.turns - row.pass),
                    color: '#b42318',
                  },
                ]}
                legend={{ position: 'bottom', layout: 'horizontal' }}
                showValues
                borderRadius={4}
                responsive
                height={280}
                ariaLabel="Pass i fail według intencji"
              />
            </div>
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
