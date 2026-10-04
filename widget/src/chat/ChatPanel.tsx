import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import type { ChatApi, ChatTurn, SessionOpenerSuggestion } from './chat-api';
import { ChatHeader } from './ChatHeader';
import { formatAssistantTurn } from './format-turn';
import { MessageBubble } from './MessageBubble';
import { shopCardUrlFromSearch, shopProductCardSrc } from './shop-product-card';
import { TURN_BUDGET_MESSAGE, TurnBudgetExceededError } from './turn-budget';
import '@fontsource-variable/montserrat';
import './ChatPanel.css';

type ChatLine = {
  role: 'user' | 'assistant';
  text: string;
  cardSrc?: string;
};

function cardSrcForTurn(turn: ChatTurn): string | undefined {
  const product = turn.data.product;
  if (!product) {
    return undefined;
  }
  return (
    shopProductCardSrc(shopCardUrlFromSearch(window.location.search), product) ??
    undefined
  );
}

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
  const [budgetSpent, setBudgetSpent] = useState(false);
  const opening = useRef<Promise<string> | null>(null);
  const conversationStarted = useRef(false);
  const messagesRef = useRef<HTMLUListElement>(null);

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
    if (!message || busy || budgetSpent) {
      return;
    }
    conversationStarted.current = true;
    setBusy(true);
    setDraft('');
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
          cardSrc: cardSrcForTurn(turn),
        };
        return next;
      });
      setSuggestions([]);
    } catch (error) {
      if (error instanceof TurnBudgetExceededError) {
        setBudgetSpent(true);
      }
      setLines((current) => {
        const next = [...current];
        next[next.length - 1] = {
          role: 'assistant',
          text:
            error instanceof TurnBudgetExceededError
              ? TURN_BUDGET_MESSAGE
              : 'Nie udało się dokończyć tej odpowiedzi.',
        };
        return next;
      });
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    const list = messagesRef.current;
    if (list && typeof list.scrollTo === 'function') {
      list.scrollTo({ top: list.scrollHeight, behavior: 'smooth' });
    }
  }, [lines]);

  const canSend = draft.trim() !== '' && !busy && !budgetSpent;

  return (
    <MotionConfig reducedMotion="user">
      <motion.section
        className="eva-chat"
        aria-label="Czat EvaBot"
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <ChatHeader typing={busy} />
        <p className="eva-chat__notice">Rozmowa jest zapisywana.</p>
        <ul
          ref={messagesRef}
          className="eva-chat__messages"
          aria-label="Wiadomości czatu"
          aria-live="polite"
        >
          {lines.map((line, index) => (
            <MessageBubble
              key={`${index}-${line.role}`}
              role={line.role}
              text={line.text}
              cardSrc={line.cardSrc}
              pending={busy && line.role === 'assistant' && index === lines.length - 1}
              showAvatar={line.role === 'assistant' && lines[index - 1]?.role !== 'assistant'}
            />
          ))}
        </ul>
        <AnimatePresence initial={false}>
          {suggestions.length > 0 ? (
            <motion.div
              key="topics"
              className="eva-chat__topics"
              role="group"
              aria-label="Tematy rozmowy"
              initial="hidden"
              animate="shown"
              exit={{ opacity: 0, y: 8, transition: { duration: 0.15 } }}
              variants={{ shown: { transition: { staggerChildren: 0.06, delayChildren: 0.2 } } }}
            >
              {suggestions.map((chip) => (
                <motion.button
                  key={chip.id}
                  type="button"
                  className="eva-chat__topic"
                  disabled={busy || budgetSpent}
                  variants={{
                    hidden: { opacity: 0, y: 8 },
                    shown: { opacity: 1, y: 0 },
                  }}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => {
                    void send(chip.message);
                  }}
                >
                  {chip.label}
                </motion.button>
              ))}
            </motion.div>
          ) : null}
        </AnimatePresence>
        <form
          className="eva-chat__composer"
          onSubmit={(event) => {
            event.preventDefault();
            void send();
          }}
        >
          <label className="eva-chat__field">
            <span className="eva-chat__label">Wiadomość</span>
            <input
              className="eva-chat__input"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              disabled={busy || budgetSpent}
              placeholder="Opisz auto lub zadaj pytanie…"
            />
          </label>
          <motion.button
            className="eva-chat__send"
            type="submit"
            aria-label="Wyślij"
            disabled={!canSend}
            whileHover={canSend ? { scale: 1.06 } : undefined}
            whileTap={canSend ? { scale: 0.9 } : undefined}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path
                d="M4 12h14M13 6l6 6-6 6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </motion.button>
        </form>
      </motion.section>
    </MotionConfig>
  );
}
