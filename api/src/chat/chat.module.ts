import { Module } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AGENT_EVENTS, type AgentEventSink } from '../agent-events/agent-event';
import { AgentEventsModule } from '../agent-events/agent-events.module';
import { ContextTreeModule } from '../context-tree/context-tree.module';
import { ContextTreeService } from '../context-tree/context-tree.service';
import { PricingModule } from '../pricing/pricing.module';
import { PricingService } from '../pricing/pricing.service';
import type { DataStore } from '../supabase/data-store';
import { DATA_STORE, SupabaseModule } from '../supabase/supabase.module';
import { TemplateCascadeModule } from '../templates/template-cascade.module';
import { TemplateCascadeService } from '../templates/template-cascade.service';
import { CHAT_AGENT } from './chat-agent.port';
import {
  CHAT_TURN_BUDGET,
  InMemoryChatTurnBudget,
  SupabaseChatTurnBudget,
  turnBudgetLimitsFromEnv,
  type ChatTurnBudget,
} from './session-turn-budget';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { CHAT_SESSIONS, InMemoryChatSessions } from './chat-session';
import {
  SESSION_CLIENTS,
  InMemorySessionClients,
  SupabaseSessionClients,
  type SessionClients,
} from './session-clients';
import { MastraChatAgent } from './mastra-chat.agent';
import { ShopTools } from './shop-tools';
import { StubChatAgent } from './stub-chat.agent';
import { SupabaseChatSessions } from './supabase-chat-sessions';
import type { Mastra } from '@mastra/core';
import { createEvaMastra } from '../mastra/create-eva-mastra';
import { EVA_SHOP_AGENT_KEY } from '../mastra/create-eva-mastra-agent';
import { EVA_MASTRA } from '../mastra/eva-mastra.token';
import { createEvaQualifierAgent } from '../mastra/intents/create-eva-qualifier-agent';
import { evaTurnWorkflows } from '../mastra/intents/eva-turn-workflows';
import { MastraIntentQualifier } from '../mastra/intents/mastra-intent-qualifier';
import {
  TURN_WORKFLOWS,
  type TurnWorkflows,
} from '../mastra/intents/turn-workflows';
import {
  INTENT_SESSION_STATE,
  InMemoryIntentSessionState,
  type IntentSessionState,
} from '../mastra/intents/intent-session-state';
import { SupabaseIntentSessionState } from '../mastra/intents/supabase-intent-session-state';

@Module({
  imports: [
    AgentEventsModule,
    TemplateCascadeModule,
    PricingModule,
    ContextTreeModule,
    SupabaseModule,
  ],
  controllers: [ChatController],
  providers: [
    {
      provide: ShopTools,
      useFactory: (
        templates: TemplateCascadeService,
        pricing: PricingService,
        contextTree: ContextTreeService,
        events: AgentEventSink,
      ) => new ShopTools(templates, pricing, contextTree, events),
      inject: [
        TemplateCascadeService,
        PricingService,
        ContextTreeService,
        AGENT_EVENTS,
      ],
    },
    {
      provide: CHAT_SESSIONS,
      useFactory: (store: DataStore | undefined) =>
        store
          ? new SupabaseChatSessions(store)
          : new InMemoryChatSessions(() => randomUUID()),
      inject: [DATA_STORE],
    },
    {
      provide: SESSION_CLIENTS,
      useFactory: (store: DataStore | undefined) =>
        store ? new SupabaseSessionClients(store) : new InMemorySessionClients(),
      inject: [DATA_STORE],
    },
    {
      provide: CHAT_TURN_BUDGET,
      useFactory: (store: DataStore | undefined): ChatTurnBudget =>
        store
          ? new SupabaseChatTurnBudget(
              store,
              turnBudgetLimitsFromEnv(process.env, { requireSalt: true }),
            )
          : new InMemoryChatTurnBudget(turnBudgetLimitsFromEnv(process.env)),
      inject: [DATA_STORE],
    },
    ChatService,
    {
      provide: INTENT_SESSION_STATE,
      useFactory: (store: DataStore | undefined): IntentSessionState =>
        store
          ? new SupabaseIntentSessionState(store)
          : new InMemoryIntentSessionState(),
      inject: [DATA_STORE],
    },
    {
      provide: TURN_WORKFLOWS,
      useFactory: (templates: TemplateCascadeService): TurnWorkflows =>
        evaTurnWorkflows({
          resolve: (input) => templates.resolve(input),
          listAliases: () => templates.listAliases(),
        }),
      inject: [TemplateCascadeService],
    },
    {
      provide: EVA_MASTRA,
      useFactory: (tools: ShopTools, events: AgentEventSink) =>
        process.env.DEEPSEEK_API_KEY
          ? createEvaMastra(tools, undefined, events)
          : undefined,
      inject: [ShopTools, AGENT_EVENTS],
    },
    {
      provide: CHAT_AGENT,
      useFactory: (
        mastra: Mastra | undefined,
        tools: ShopTools,
        intentState: IntentSessionState,
        events: AgentEventSink,
        sessionClients: SessionClients,
        workflows: TurnWorkflows,
      ) => {
        if (!mastra) {
          return new StubChatAgent(tools);
        }
        return new MastraChatAgent(
          mastra.getAgent(EVA_SHOP_AGENT_KEY),
          new MastraIntentQualifier(createEvaQualifierAgent()),
          intentState,
          events,
          undefined,
          sessionClients,
          workflows,
        );
      },
      inject: [
        EVA_MASTRA,
        ShopTools,
        INTENT_SESSION_STATE,
        AGENT_EVENTS,
        SESSION_CLIENTS,
        TURN_WORKFLOWS,
      ],
    },
  ],
  exports: [EVA_MASTRA, CHAT_SESSIONS],
})
export class ChatModule {}
