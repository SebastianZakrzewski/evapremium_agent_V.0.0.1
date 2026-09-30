import type { ChatSessions } from './chat-session';

export type SessionOpenerSuggestion = {
  id: string;
  label: string;
  message: string;
};

export type CreatedChatSession = {
  sessionId: string;
  greeting: string;
  suggestions: SessionOpenerSuggestion[];
};

export const SESSION_OPENER_GREETING =
  'Pomagam sprawdzić, czy mamy szablon dywaników EVA pod Twoją markę, model i rocznik, podać orientacyjną cenę kompletu oraz odpowiedzieć o piance EVA, kolorach, czasie szycia, dostawie kurierem, gwarancji i czyszczeniu. Cena i fakty biorę z katalogu sklepu — nie zgaduję.\n\nWybierz pytanie albo napisz własne.';

export const SESSION_OPENER_SUGGESTIONS: SessionOpenerSuggestion[] = [
  {
    id: 'fit',
    label: 'Szablon pod markę i model?',
    message:
      'Czy macie dywaniki EVA dopasowane do mojej marki, modelu i rocznika?',
  },
  {
    id: 'pricing',
    label: 'Cena kompletu do auta?',
    message:
      'Jaka jest orientacyjna cena kompletu dywaników EVA do mojego auta?',
  },
  {
    id: 'materials',
    label: 'Pianka EVA i kolory?',
    message:
      'Z jakiej pianki EVA są dywaniki i jakie kolory są w ofercie?',
  },
  {
    id: 'delivery',
    label: 'Czas szycia i kurier?',
    message: 'Ile trwa szycie kompletu i jak wygląda dostawa kurierem?',
  },
  {
    id: 'after_sales',
    label: 'Gwarancja i czyszczenie?',
    message:
      'Jaka jest gwarancja na wady materiałowe i jak czyścić dywaniki EVA?',
  },
];

export function openedChatSession(sessionId: string): CreatedChatSession {
  return {
    sessionId,
    greeting: SESSION_OPENER_GREETING,
    suggestions: SESSION_OPENER_SUGGESTIONS,
  };
}

export async function persistOpenedChatSession(
  sessions: Pick<ChatSessions, 'create' | 'appendMessage'>,
): Promise<CreatedChatSession> {
  const { sessionId } = await sessions.create();
  const opened = openedChatSession(sessionId);
  await sessions.appendMessage({
    sessionId,
    role: 'assistant',
    body: opened.greeting,
  });
  return opened;
}
