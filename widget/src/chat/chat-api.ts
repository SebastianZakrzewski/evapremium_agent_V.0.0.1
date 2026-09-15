export type SessionOpenerSuggestion = {
  id: string;
  label: string;
  message: string;
};

export type CreatedSession = {
  sessionId: string;
  greeting: string;
  suggestions: SessionOpenerSuggestion[];
};

export type ChatTurn = {
  sessionId: string;
  text: string;
  data: {
    status?: string;
    amount?: number;
    currency?: string;
    body?: string;
  };
};

export type ChatApi = {
  createSession: () => Promise<CreatedSession>;
  postMessage: (
    sessionId: string,
    message: string,
    onDelta?: (text: string) => void,
  ) => Promise<ChatTurn>;
};
