import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  AGENT_EVENTS,
  type AgentEventStore,
} from '../agent-events/agent-event';
import { containerLogs } from '../agent-events/container-log-buffer';
import {
  CHAT_SESSIONS,
  UnknownSessionError,
  type ChatSessions,
} from '../chat/chat-session';
import { ContextTreeService } from '../context-tree/context-tree.service';
import {
  contextActivityEvents,
  contextActivityRange,
  containerTurnEvents,
  listSessionMarkers,
  mergeContainerLog,
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
    private readonly contextTree: ContextTreeService,
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

  contextGraph() {
    return this.contextTree.similarityGraph();
  }

  async contextActivity(since?: string, now: Date = new Date()) {
    const range = contextActivityRange(since, now);
    const events = await this.events.listInRange(range.fromIso, range.toIso);
    return contextActivityEvents(events, since);
  }

  async containerLog(after?: string, since?: string, now: Date = new Date()) {
    const parsed = after === undefined ? Number.NaN : Number(after);
    const memory = containerLogs.list(Number.isInteger(parsed) ? parsed : undefined);
    const range = contextActivityRange(since, now);
    const events = await this.events.listInRange(range.fromIso, range.toIso);
    return mergeContainerLog(memory, containerTurnEvents(events, since));
  }
}
