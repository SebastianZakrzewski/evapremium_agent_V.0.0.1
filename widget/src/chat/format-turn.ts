export type ChatTurnData = {
  status?: string;
  amount?: number;
  currency?: string;
  body?: string;
};

export type AssistantTurn = {
  text?: string;
  data: ChatTurnData;
};

export function formatAssistantTurn(turn: AssistantTurn): string {
  const { data } = turn;
  if (data.status === 'quoted' && typeof data.amount === 'number') {
    return `Wycena orientacyjna: ${data.amount} ${data.currency ?? 'PLN'}. Cena ostateczna w konfiguratorze.`;
  }
  if (data.status === 'miss') {
    return 'Nie mam tego w wiedzy sklepu. Mogę połączyć z obsługą po zgodzie na kontakt.';
  }
  if (typeof turn.text === 'string' && turn.text !== '') {
    return turn.text;
  }
  if (data.status === 'hit' && typeof data.body === 'string' && data.body !== '') {
    return data.body;
  }
  if (data.status === 'hit') {
    return 'Informacja sklepu jest w przygotowaniu.';
  }
  return 'Nie udało się dokończyć tej odpowiedzi.';
}
