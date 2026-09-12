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
  createSession: () => Promise<{ sessionId: string }>;
  postMessage: (
    sessionId: string,
    message: string,
    onDelta?: (text: string) => void,
  ) => Promise<ChatTurn>;
};
