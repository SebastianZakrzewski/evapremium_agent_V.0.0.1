import { useEffect, useRef, useState } from 'react';
import {
  fetchContainerLog,
  type ContainerIntentLog,
  type ContainerLogLine,
  type DecisionTraceLog,
} from './dashboard-api';

const LOG_POLL_MS = 2000;

function dash(value: string | undefined): string {
  return value && value.length > 0 ? value : '—';
}

function IntentTurnBlock({
  line,
}: {
  line: ContainerIntentLog | DecisionTraceLog;
}) {
  const rejected =
    line.candidateIntent !== undefined &&
    line.candidateIntent !== line.acceptedIntent;
  const outOfScope =
    line.forcedOutOfScope || line.acceptedIntent === 'out_of_scope';
  const tools = line.tools.length > 0 ? line.tools.join(', ') : '—';
  const scope = line.forcedOutOfScope ? 'wymuszony poza ofertą' : 'w ofercie';

  return (
    <pre className="container-log-turn">
      <span className="log-tag">[intent-turn]</span>{' '}
      <span className="log-dim">sesja</span> {dash(line.sessionId)}
      {'\n'}
      <span className="log-label">było</span>
      <span className="log-blue">{dash(line.currentIntent)}</span>
      {'\n'}
      <span className="log-label">kandydat</span>
      <span className={rejected ? 'log-yellow' : 'log-blue'}>
        {dash(line.candidateIntent)}
      </span>
      {'\n'}
      <span className="log-label">przyjęto</span>
      <span className={outOfScope ? 'log-red' : 'log-green'}>
        {line.acceptedIntent}
      </span>
      {'\n'}
      <span className="log-label">sub-intencja</span>
      <span className="log-blue">{dash(line.subIntent ?? undefined)}</span>
      {'\n'}
      <span className="log-label">tryb</span>
      <span className="log-blue">{dash(line.mode ?? undefined)}</span>
      {'\n'}
      <span className="log-label">wykonanie</span>
      <span className="log-magenta">{dash(line.execution)}</span>
      {'\n'}
      <span className="log-label">cel</span>
      <span className="log-magenta">{dash(line.executionTarget)}</span>
      {'\n'}
      <span className="log-label">narzędzia</span>
      <span className="log-magenta">{tools}</span>
      {'\n'}
      <span className="log-label">zakres</span>
      <span className={line.forcedOutOfScope ? 'log-red' : 'log-green'}>
        {scope}
      </span>
    </pre>
  );
}

export function ContainerLog({ token }: { token: string }) {
  const [lines, setLines] = useState<ContainerLogLine[]>([]);
  const [error, setError] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const after = useRef<number | undefined>(undefined);
  const since = useRef<string | undefined>(undefined);

  useEffect(() => {
    const box = scroller.current;
    if (box === null) {
      return;
    }
    box.scrollTop = box.scrollHeight;
  }, [lines]);

  useEffect(() => {
    let stopped = false;
    let timer = 0;

    async function poll() {
      const controller = new AbortController();
      try {
        const fresh = await fetchContainerLog(
          after.current,
          since.current,
          token,
          controller.signal,
        );
        if (stopped) {
          return;
        }
        setError(null);
        if (fresh.length > 0) {
          const memory = fresh.filter((line) => line.kind !== 'decision-trace');
          const traces = fresh.filter((line) => line.kind === 'decision-trace');
          const lastMemory = memory[memory.length - 1];
          if (lastMemory !== undefined) {
            after.current = lastMemory.seq;
          }
          const lastTrace = traces[traces.length - 1];
          if (lastTrace !== undefined) {
            since.current = lastTrace.occurredAt;
          }
          setLines((current) => {
            const seen = new Set(
              current
                .filter((line) => line.kind === 'decision-trace')
                .map((line) => line.id),
            );
            const novel = fresh.filter(
              (line) => line.kind !== 'decision-trace' || !seen.has(line.id),
            );
            return [...current, ...novel];
          });
        }
      } catch (reason: unknown) {
        if (!stopped) {
          setError(
            reason instanceof Error
              ? reason.message
              : 'Nie udało się pobrać logu kontenera.',
          );
        }
      }
      if (!stopped) {
        timer = window.setTimeout(() => {
          void poll();
        }, LOG_POLL_MS);
      }
    }

    void poll();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [token]);

  return (
    <section className="container-log" aria-label="Log kontenera">
      <h2>Log kontenera</h2>
      <div className="container-log-scroll" ref={scroller}>
        {lines.length === 0 && error === null && (
          <p className="container-log-empty">Brak linii w tym procesie.</p>
        )}
        {lines.map((line) =>
          line.kind === 'tool' ? (
            <p className="container-log-tool" key={line.seq}>
              użyte narzędzie: &quot;{line.toolId}&quot;
            </p>
          ) : (
            <IntentTurnBlock
              key={line.kind === 'decision-trace' ? line.id : line.seq}
              line={line}
            />
          ),
        )}
      </div>
      {error && <p className="container-log-error">{error}</p>}
    </section>
  );
}
