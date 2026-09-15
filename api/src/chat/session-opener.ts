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
  'Pomagam dobrać dywaniki EVA do auta, podać orientacyjną wycenę i odpowiedzieć na pytania o materiał, dostawę, gwarancję i pielęgnację. Cena i fakty biorę z katalogu sklepu — nie zgaduję.\n\nWybierz temat albo napisz własne pytanie.';

export const SESSION_OPENER_SUGGESTIONS: SessionOpenerSuggestion[] = [
  {
    id: 'fit',
    label: 'Dopasowanie do auta',
    message: 'Chcę dobrać dywaniki EVA do mojego auta.',
  },
  {
    id: 'pricing',
    label: 'Wycena orientacyjna',
    message: 'Ile kosztują dywaniki EVA do mojego auta?',
  },
  {
    id: 'materials',
    label: 'Materiał i kolory',
    message: 'Z czego są zrobione dywaniki i jakie są kolory?',
  },
  {
    id: 'delivery',
    label: 'Dostawa i czas realizacji',
    message: 'Kiedy wyślecie zamówienie i jak wygląda dostawa?',
  },
  {
    id: 'after_sales',
    label: 'Gwarancja i pielęgnacja',
    message: 'Jaka jest gwarancja i jak czyścić dywaniki EVA?',
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
