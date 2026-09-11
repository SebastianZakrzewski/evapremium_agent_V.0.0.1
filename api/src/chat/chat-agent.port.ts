export const CHAT_AGENT = Symbol('CHAT_AGENT');

export type ChatAgentTurn = {
  text: string;
  data: unknown;
};

export interface ChatAgent {
  handle(message: string): Promise<ChatAgentTurn>;
}
