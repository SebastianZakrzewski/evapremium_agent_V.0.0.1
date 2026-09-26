import { useEffect, useRef, useState } from 'react';
import {
  fetchContainerLog,
  type ContainerIntentLog,
  type ContainerLogLine,
  type ContainerTreeLookupLog,
  type ContainerTreeSearchLog,
  type DecisionTraceLog,
} from './dashboard-api';

const LOG_POLL_MS = 2000;
const TRACE_MATCH_MS = 15_000;

function later(current: string | undefined, next: string | undefined): string | undefined {
  if (next === undefined) {
    return current;
  }
  if (current === undefined || next > current) {
    return next;
  }
  return current;
}

function duplicatesShownIntent(
  trace: DecisionTraceLog,
  shown: ContainerLogLine[],
): boolean {
  const at = Date.parse(trace.occurredAt);
  return shown.some((line) => {
    if (line.kind !== 'intent-turn' || line.sessionId !== trace.sessionId) {
      return false;
    }
    return Math.abs(Date.parse(line.occurredAt) - at) <= TRACE_MATCH_MS;
  });
}

function dash(value: string | undefined): string {
  return value && value.length > 0 ? value : '—';
}

function slugList(slugs: readonly string[]): string {
  return slugs.length > 0 ? slugs.join(', ') : '—';
}

function confidenceLabel(value: string | undefined): string {
  if (value === 'high') {
    return 'wysoka';
  }
  if (value === 'ambiguous') {
    return 'niejednoznaczna';
  }
  return '—';
}

function agreementLabel(value: ContainerTreeLookupLog['agreement']): string {
  if (value === 'top') {
    return '#1';
  }
  if (value === 'listed') {
    return 'w rankingu';
  }
  if (value === 'outside') {
    return 'poza rankingiem';
  }
  return '—';
}

function TreeSearchBlock({ line }: { line: ContainerTreeSearchLog }) {
  const confidence = line.leaves[0]?.confidence;
  const confidenceClass =
    confidence === 'high'
      ? 'log-green'
      : confidence === 'ambiguous'
        ? 'log-yellow'
        : 'log-dim';
  return (
    <pre className="container-log-turn">
      <span className="log-tag">[drzewo]</span>{' '}
      <span className="log-dim">sesja</span> {dash(line.sessionId)}
      {'\n'}
      <span className="log-label">gałęzie</span>
      <span className="log-magenta">{slugList(line.preferredBranches)}</span>
      {'\n'}
      <span className="log-label">ranking</span>
      <span className="log-magenta">{slugList(line.rankedBranches)}</span>
      {'\n'}
      <span className="log-label">liście</span>
      <span className="log-blue">
        {slugList(line.leaves.map((leaf) => leaf.slug))}
      </span>
      {'\n'}
      <span className="log-label">pewność</span>
      <span className={confidenceClass}>{confidenceLabel(confidence)}</span>
    </pre>
  );
}

function TreeLookupBlock({ line }: { line: ContainerTreeLookupLog }) {
  const agreementClass =
    line.agreement === 'top'
      ? 'log-green'
      : line.agreement === 'listed'
        ? 'log-yellow'
        : line.agreement === 'outside'
          ? 'log-red'
          : 'log-dim';
  return (
    <pre className="container-log-turn">
      <span className="log-tag">[drzewo]</span>{' '}
      <span className="log-dim">sesja</span> {dash(line.sessionId)}
      {'\n'}
      <span className="log-label">liść</span>
      <span className="log-blue">{line.slug}</span>
      {'\n'}
      <span className="log-label">wynik</span>
      <span className={line.outcome === 'hit' ? 'log-green' : 'log-red'}>
        {line.outcome === 'hit' ? 'trafienie' : 'pudło'}
      </span>
      {'\n'}
      <span className="log-label">zgodność</span>
      <span className={agreementClass}>{agreementLabel(line.agreement)}</span>
    </pre>
  );
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
          const cursor = after.current;
          const restarted =
            cursor !== undefined && memory.some((line) => line.seq <= cursor);
          const lastMemory = memory[memory.length - 1];
          if (lastMemory !== undefined) {
            after.current = lastMemory.seq;
          }
          setLines((current) => {
            const base = restarted
              ? current.filter((line) => line.kind === 'decision-trace')
              : current;
            const seen = new Set(
              base
                .filter((line) => line.kind === 'decision-trace')
                .map((line) => line.id),
            );
            const novel: ContainerLogLine[] = [];
            let until = since.current;
            for (const line of fresh) {
              if (line.kind === 'decision-trace') {
                until = later(until, line.occurredAt);
                if (seen.has(line.id) || duplicatesShownIntent(line, base)) {
                  continue;
                }
                novel.push(line);
                continue;
              }
              if (line.kind === 'intent-turn') {
                until = later(until, line.traceAt);
              }
              novel.push(line);
            }
            since.current = until;
            return [...base, ...novel];
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
        {lines.map((line) => {
          if (line.kind === 'tool') {
            return (
              <p className="container-log-tool" key={line.seq}>
                użyte narzędzie: &quot;{line.toolId}&quot;
              </p>
            );
          }
          if (line.kind === 'tree-search') {
            return <TreeSearchBlock key={line.seq} line={line} />;
          }
          if (line.kind === 'tree-lookup') {
            return <TreeLookupBlock key={line.seq} line={line} />;
          }
          return (
            <IntentTurnBlock
              key={line.kind === 'decision-trace' ? line.id : line.seq}
              line={line}
            />
          );
        })}
      </div>
      {error && <p className="container-log-error">{error}</p>}
    </section>
  );
}
