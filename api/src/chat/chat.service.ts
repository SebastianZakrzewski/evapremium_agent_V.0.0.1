import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CHAT_AGENT, type ChatAgent } from './chat-agent.port';
import { InMemoryChatSessions, UnknownSessionError } from './chat-session';
import { postChatMessage } from './post-chat-message';

@Injectable()
export class ChatService {
  private readonly sessions = new InMemoryChatSessions(() => randomUUID());

  constructor(@Inject(CHAT_AGENT) private readonly agent: ChatAgent) {}

  createSession(): { sessionId: string } {
    return this.sessions.create();
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
}
