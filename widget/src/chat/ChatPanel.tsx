import { useEffect, useRef, useState } from 'react';
import type { ChatApi, SessionOpenerSuggestion } from './chat-api';
import { formatAssistantTurn } from './format-turn';
import './ChatPanel.css';

type ChatLine = {
  role: 'user' | 'assistant';
  text: string;
};

type ChatPanelProps = {
  api: ChatApi;
};

export function ChatPanel({ api }: ChatPanelProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [lines, setLines] = useState<ChatLine[]>([]);
  const [suggestions, setSuggestions] = useState<SessionOpenerSuggestion[]>(
    [],
  );
  const [busy, setBusy] = useState(false);
  const opening = useRef<Promise<string> | null>(null);
  const conversationStarted = useRef(false);

  async function ensureSession(): Promise<string> {
    if (sessionId) {
      return sessionId;
    }
    if (!opening.current) {
      opening.current = api.createSession().then((created) => {
        setSessionId(created.sessionId);
        if (created.greeting) {
          setLines((current) => {
            if (current.some((line) => line.text === created.greeting)) {
              return current;
            }
            return [{ role: 'assistant', text: created.greeting }, ...current];
          });
        }
        if (!conversationStarted.current) {
          setSuggestions(created.suggestions ?? []);
        }
        return created.sessionId;
      });
    }
    return opening.current;
  }

  useEffect(() => {
    void ensureSession().catch(() => {
      opening.current = null;
    });
  }, [api]);

  async function send(text = draft) {
    const message = text.trim();
    if (!message || busy) {
      return;
    }
    conversationStarted.current = true;
    setBusy(true);
    setDraft('');
    setSuggestions([]);
    setLines((current) => [
      ...current,
      { role: 'user', text: message },
      { role: 'assistant', text: '' },
    ]);
    try {
      const id = await ensureSession();
      const turn = await api.postMessage(id, message, (chunk) => {
        setLines((current) => {
          const next = [...current];
          const last = next[next.length - 1];
          if (last?.role === 'assistant') {
            next[next.length - 1] = { role: 'assistant', text: last.text + chunk };
          }
          return next;
        });
      });
      setLines((current) => {
        const next = [...current];
        next[next.length - 1] = {
          role: 'assistant',
          text: formatAssistantTurn(turn),
        };
        return next;
      });
    } catch {
      setLines((current) => {
        const next = [...current];
        next[next.length - 1] = {
          role: 'assistant',
          text: 'Nie udało się dokończyć tej odpowiedzi.',
        };
        return next;
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="eva-chat" aria-label="Czat EvaBot">
      <header className="eva-chat__header">
        <img
          className="eva-chat__avatar"
          src="/evabot-icon.jpg"
          alt=""
          width={56}
          height={56}
        />
        <div>
          <h1 className="eva-chat__title">EvaBot</h1>
          <p className="eva-chat__brand">EVA Premium</p>
        </div>
      </header>
      <p className="eva-chat__notice">Rozmowa jest zapisywana.</p>
      <ul className="eva-chat__messages" aria-label="Wiadomości czatu">
        {lines.map((line, index) => (
          <li
            key={`${index}-${line.role}`}
            className={`eva-chat__bubble eva-chat__bubble--${line.role}`}
          >
            {line.role === 'assistant' && line.text === '' && busy ? (
              <span className="eva-chat__typing" aria-label="Pisze">
                ●●●
              </span>
            ) : (
              line.text
            )}
          </li>
        ))}
      </ul>
      {suggestions.length > 0 ? (
        <div className="eva-chat__topics" role="group" aria-label="Tematy rozmowy">
          {suggestions.map((chip) => (
            <button
              key={chip.id}
              type="button"
              className="eva-chat__topic"
              disabled={busy}
              onClick={() => {
                void send(chip.message);
              }}
            >
              {chip.label}
            </button>
          ))}
        </div>
      ) : null}
      <form
        className="eva-chat__composer"
        onSubmit={(event) => {
          event.preventDefault();
          void send();
        }}
      >
        <label className="eva-chat__label">
          Wiadomość
          <input
            className="eva-chat__input"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            disabled={busy}
            placeholder="Opisz auto lub zadaj pytanie…"
          />
        </label>
        <button className="eva-chat__send" type="submit" disabled={busy}>
          Wyślij
        </button>
      </form>
    </section>
  );
}
