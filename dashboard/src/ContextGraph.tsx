import { useEffect, useState, type ReactNode } from 'react';
import { BrainAtlasCanvas } from './brain-atlas-canvas';
import { ContainerLog } from './ContainerLog';
import {
  fetchContextActivity,
  fetchContextGraph,
  fetchSession,
  fetchSessions,
  type ContextGraph as ContextGraphData,
  type SessionListItem,
} from './dashboard-api';
import {
  contextNodeState,
  contextTurnFrames,
  type ContextTurnFrame,
} from './context-turn-frames';

const LIVE_POLL_MS = 2000;

function requestError(reason: unknown, fallback: string): string {
  return reason instanceof Error ? reason.message : fallback;
}

function hasTurnPath(
  nodes: ContextGraphData['nodes'],
  frame: ContextTurnFrame | null,
): boolean {
  if (frame === null) {
    return false;
  }
  const known = new Set(nodes.map((node) => node.slug));
  let count = 0;
  let previous = '';
  for (const slug of frame.path) {
    if (!known.has(slug) || slug === previous) {
      continue;
    }
    previous = slug;
    count += 1;
  }
  return count >= 2;
}

export function ContextGraphView({
  date,
  token,
  onSignOut,
  navigation,
}: {
  date: string;
  token: string;
  onSignOut: () => void;
  navigation: ReactNode;
}) {
  const [graph, setGraph] = useState<ContextGraphData | null>(null);
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [sessionId, setSessionId] = useState('');
  const [frames, setFrames] = useState<ContextTurnFrame[]>([]);
  const [frameIndex, setFrameIndex] = useState(-1);
  const [live, setLive] = useState(false);
  const [liveFrame, setLiveFrame] = useState<ContextTurnFrame | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activityError, setActivityError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetchContextGraph(token, controller.signal)
      .then(setGraph)
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setError(requestError(reason, 'Nie udało się pobrać grafu kontekstu.'));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [token]);

  useEffect(() => {
    const controller = new AbortController();
    fetchSessions(date, '', token, controller.signal)
      .then(setSessions)
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setError(requestError(reason, 'Nie udało się pobrać listy sesji.'));
        }
      });
    return () => controller.abort();
  }, [date, token]);

  useEffect(() => {
    if (!sessionId) {
      setFrames([]);
      setFrameIndex(-1);
      return;
    }
    const controller = new AbortController();
    fetchSession(sessionId, token, controller.signal)
      .then((session) => {
        setFrames(contextTurnFrames(session.events));
        setFrameIndex(-1);
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setError(requestError(reason, 'Nie udało się pobrać sesji.'));
        }
      });
    return () => controller.abort();
  }, [sessionId, token]);

  useEffect(() => {
    if (!live) {
      return;
    }
    let since = new Date().toISOString();
    const seen = new Set<string>();
    let timer = 0;
    let stopped = false;

    async function poll() {
      const controller = new AbortController();
      try {
        const events = await fetchContextActivity(since, token, controller.signal);
        const fresh = events.filter((event) => !seen.has(event.id));
        for (const event of fresh) {
          seen.add(event.id);
        }
        const last = fresh[fresh.length - 1];
        if (last) {
          since = last.occurredAt;
        }
        if (stopped) {
          return;
        }
        setActivityError(null);
        const nextFrames = contextTurnFrames(fresh);
        const latest = nextFrames[nextFrames.length - 1];
        if (latest) {
          setLiveFrame(latest);
        }
      } catch (reason: unknown) {
        if (!stopped) {
          setActivityError(
            requestError(reason, 'Nie udało się pobrać aktywności drzewa.'),
          );
        }
      }
      if (!stopped) {
        timer = window.setTimeout(() => {
          void poll();
        }, LIVE_POLL_MS);
      }
    }

    timer = window.setTimeout(() => {
      void poll();
    }, LIVE_POLL_MS);
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [live, token]);

  const replayFrame = frameIndex >= 0 ? (frames[frameIndex] ?? null) : null;
  const frame = live && liveFrame ? liveFrame : replayFrame;

  return (
    <main className="dashboard-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">EVA Premium · Agent</p>
          <h1>Graf kontekstu</h1>
          {navigation}
        </div>
        <div className="topbar-actions filter-actions">
          <label htmlFor="graph-session">Sesja</label>
          <select
            id="graph-session"
            value={sessionId}
            onChange={(event) => setSessionId(event.target.value)}
          >
            <option value="">Mapa bez ścieżki</option>
            {sessions.map((session) => (
              <option key={session.sessionId} value={session.sessionId}>
                {session.sessionId}
              </option>
            ))}
          </select>
          <button
            className="text-button"
            type="button"
            disabled={
              live || frames.length === 0 || frameIndex >= frames.length - 1
            }
            onClick={() => setFrameIndex((index) => index + 1)}
          >
            Następna klatka
          </button>
          <button
            className={live ? 'text-button is-pressed' : 'text-button'}
            type="button"
            aria-pressed={live}
            onClick={() => {
              setLive((value) => !value);
              setLiveFrame(null);
            }}
          >
            Na żywo
          </button>
          <button className="text-button" type="button" onClick={onSignOut}>
            Zmień token
          </button>
        </div>
      </header>

      <section className="intro">
        <p>
          Liście leżą na korze bliżej siebie, gdy ich wektory są podobne.
          Klatka tury zapala kandydatów, trafienie i ścieżkę między nimi.
        </p>
        {frame && (
          <p className="graph-caption">
            {live ? 'Śledzona sesja' : 'Odtwarzana sesja'} {frame.sessionId}
            {frames.length > 0 && !live
              ? ` · klatka ${frameIndex + 1} z ${frames.length}`
              : ''}
          </p>
        )}
      </section>

      {loading && <p className="status">Pobieram graf…</p>}
      {(error ?? activityError) && (
        <p className="status status-error" role="alert">
          {error ?? activityError}
        </p>
      )}
      {graph && graph.nodes.length === 0 && (
        <p className="empty-state">Brak liści z embeddingiem.</p>
      )}
      {graph && graph.nodes.length > 0 && (
        <>
          <ul className="context-graph-state">
            {graph.nodes.map((node) => (
              <li
                key={node.slug}
                data-testid={`graph-node-${node.slug}`}
                data-state={contextNodeState(node.slug, frame)}
              >
                {node.title}
              </li>
            ))}
          </ul>
          {hasTurnPath(graph.nodes, frame) && (
            <span data-testid="turn-path" className="context-graph-state" />
          )}
          <BrainAtlasCanvas nodes={graph.nodes} edges={graph.edges} frame={frame} />
        </>
      )}
      <ContainerLog token={token} />
    </main>
  );
}
