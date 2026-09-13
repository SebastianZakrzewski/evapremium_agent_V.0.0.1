import { Module } from '@nestjs/common';
import type { DataStore } from '../supabase/data-store';
import { DATA_STORE, SupabaseModule } from '../supabase/supabase.module';
import { AGENT_EVENTS, type AgentEventStore } from './agent-event';
import { InMemoryAgentEvents } from './in-memory-agent-events';
import { SupabaseAgentEvents } from './supabase-agent-events';

@Module({
  imports: [SupabaseModule],
  providers: [
    {
      provide: AGENT_EVENTS,
      useFactory: (store: DataStore | undefined): AgentEventStore =>
        store ? new SupabaseAgentEvents(store) : new InMemoryAgentEvents(),
      inject: [DATA_STORE],
    },
  ],
  exports: [AGENT_EVENTS],
})
export class AgentEventsModule {}
