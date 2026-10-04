import type { ChatSessions } from './chat-session';
import { persistOpenedChatSession, type CreatedChatSession } from './session-opener';
import { TurnBudgetExceededError, type ChatTurnBudget } from './session-turn-budget';

export class EmptyChatMessageError extends Error {
  constructor() {
    super('message is required');
    this.name = 'EmptyChatMessageError';
  }
}

export async function openBudgetedChatSession(
  sessions: Pick<ChatSessions, 'create' | 'appendMessage'>,
  budget: ChatTurnBudget,
  ip: string,
  now = new Date(),
): Promise<CreatedChatSession> {
  const allowed = await budget.reserveGuestSession(ip, now);
  if (!allowed) {
    throw new TurnBudgetExceededError();
  }
  return persistOpenedChatSession(sessions);
}

export async function acceptChatTurn(
  sessions: Pick<ChatSessions, 'assertExists'>,
  budget: ChatTurnBudget,
  sessionId: string,
  message: string,
  ip: string,
  now = new Date(),
): Promise<void> {
  if (message.trim() === '') {
    throw new EmptyChatMessageError();
  }
  await sessions.assertExists(sessionId);
  const allowed = await budget.reserveUserMessage(sessionId, ip, now);
  if (!allowed) {
    throw new TurnBudgetExceededError();
  }
}
