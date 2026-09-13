import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  AGENT_EVENTS,
  type AgentEventStore,
} from '../agent-events/agent-event';
import {
  CHAT_SESSIONS,
  UnknownSessionError,
  type ChatSessions,
} from '../chat/chat-session';
import {
  listSessionMarkers,
  sessionView,
  summarizeDay,
  utcDayRange,
  type SessionMarker,
} from './dashboard-read';

@Injectable()
export class DashboardQueryService {
  constructor(
    @Inject(AGENT_EVENTS) private readonly events: AgentEventStore,
    @Inject(CHAT_SESSIONS) private readonly sessions: ChatSessions,
  ) {}

  async summary(date: string) {
    const range = utcDayRange(date);
    const events = await this.events.listInRange(range.fromIso, range.toIso);
    return summarizeDay(date, events);
  }

  async listSessions(date: string, marker?: SessionMarker) {
    const range = utcDayRange(date);
    const events = await this.events.listInRange(range.fromIso, range.toIso);
    return listSessionMarkers(events, marker);
  }

  async session(sessionId: string) {
    try {
      const [messages, events] = await Promise.all([
        this.sessions.listMessages(sessionId),
        this.events.listBySession(sessionId),
      ]);
      return sessionView(sessionId, messages, events);
    } catch (error) {
      if (error instanceof UnknownSessionError) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }
}
