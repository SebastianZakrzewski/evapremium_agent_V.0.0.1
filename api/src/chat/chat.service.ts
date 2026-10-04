import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { acceptChatTurn, EmptyChatMessageError, openBudgetedChatSession } from './accept-chat-turn';
import { CHAT_AGENT, type ChatAgent } from './chat-agent.port';
import {
  CHAT_SESSIONS,
  UnknownSessionError,
  type ChatSessions,
} from './chat-session';
import { postChatMessage } from './post-chat-message';
import type { CreatedChatSession } from './session-opener';
import { CHAT_TURN_BUDGET, type ChatTurnBudget } from './session-turn-budget';
import { streamChatMessage } from './stream-chat-message';

@Injectable()
export class ChatService {
  constructor(
    @Inject(CHAT_AGENT) private readonly agent: ChatAgent,
    @Inject(CHAT_SESSIONS) private readonly sessions: ChatSessions,
    @Inject(CHAT_TURN_BUDGET) private readonly budget: ChatTurnBudget,
  ) {}

  createSession(ip: string, now = new Date()): Promise<CreatedChatSession> {
    return openBudgetedChatSession(this.sessions, this.budget, ip, now);
  }

  async acceptTurn(
    sessionId: string,
    message: string,
    ip: string,
    now = new Date(),
  ): Promise<void> {
    try {
      await acceptChatTurn(this.sessions, this.budget, sessionId, message, ip, now);
    } catch (error) {
      if (error instanceof EmptyChatMessageError) {
        throw new BadRequestException(error.message);
      }
      if (error instanceof UnknownSessionError) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }

  async postMessage(sessionId: string, message: string, ip: string, now = new Date()) {
    await this.acceptTurn(sessionId, message, ip, now);
    return postChatMessage(this.sessions, this.agent, sessionId, message);
  }

  async *streamMessage(sessionId: string, message: string) {
    yield* streamChatMessage(this.sessions, this.agent, sessionId, message);
  }
}
