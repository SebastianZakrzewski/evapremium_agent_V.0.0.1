import { Module } from '@nestjs/common';
import { AGENT_EVENTS } from './agent-event';
import { InMemoryAgentEvents } from './in-memory-agent-events';

@Module({
  providers: [
    {
      provide: AGENT_EVENTS,
      useClass: InMemoryAgentEvents,
    },
  ],
  exports: [AGENT_EVENTS],
})
export class AgentEventsModule {}
