import { useState } from 'react';
import type { ChatApi } from './chat-api';
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
  const [busy, setBusy] = useState(false);

  async function send() {
    const message = draft.trim();
    if (!message || busy) {
      return;
    }
    setBusy(true);
    setDraft('');
    setLines((current) => [
      ...current,
      { role: 'user', text: message },
      { role: 'assistant', text: '' },
    ]);
    try {
      let id = sessionId;
      if (!id) {
        const session = await api.createSession();
        id = session.sessionId;
        setSessionId(id);
      }
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
