import { useState } from 'react';
import type { ChatApi } from './chat-api';
import { formatAssistantTurn } from './format-turn';

type ChatPanelProps = {
  api: ChatApi;
};

export function ChatPanel({ api }: ChatPanelProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [lines, setLines] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  async function send() {
    const message = draft.trim();
    if (!message || busy) {
      return;
    }
    setBusy(true);
    setDraft('');
    setLines((current) => [...current, message]);
    try {
      let id = sessionId;
      if (!id) {
        const session = await api.createSession();
        id = session.sessionId;
        setSessionId(id);
      }
      const turn = await api.postMessage(id, message);
      setLines((current) => [...current, formatAssistantTurn(turn)]);
    } catch {
      setLines((current) => [...current, 'Nie udało się dokończyć tej odpowiedzi.']);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <p>Rozmowa jest zapisywana.</p>
      <ul aria-label="Wiadomości czatu">
        {lines.map((line, index) => (
          <li key={`${index}-${line}`}>{line}</li>
        ))}
      </ul>
      <label>
        Wiadomość
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          disabled={busy}
        />
      </label>
      <button type="button" onClick={() => void send()} disabled={busy}>
        Wyślij
      </button>
    </section>
  );
}
