import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CHAT_AGENT, type ChatAgent } from './chat-agent.port';
import {
  CHAT_SESSIONS,
  UnknownSessionError,
  type ChatSessions,
} from './chat-session';
import { postChatMessage } from './post-chat-message';
import { persistOpenedChatSession, type CreatedChatSession } from './session-opener';
import { streamChatMessage } from './stream-chat-message';

@Injectable()
export class ChatService {
  constructor(
    @Inject(CHAT_AGENT) private readonly agent: ChatAgent,
    @Inject(CHAT_SESSIONS) private readonly sessions: ChatSessions,
  ) {}

  createSession(): Promise<CreatedChatSession> {
    return persistOpenedChatSession(this.sessions);
  }

  async postMessage(sessionId: string, message: string) {
    try {
      return await postChatMessage(this.sessions, this.agent, sessionId, message);
    } catch (error) {
      if (error instanceof UnknownSessionError) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }

  async *streamMessage(sessionId: string, message: string) {
    try {
      yield* streamChatMessage(this.sessions, this.agent, sessionId, message);
    } catch (error) {
      if (error instanceof UnknownSessionError) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }
}
