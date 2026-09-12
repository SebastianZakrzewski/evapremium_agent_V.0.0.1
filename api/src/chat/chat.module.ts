import { Module } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ContextTreeModule } from '../context-tree/context-tree.module';
import { ContextTreeService } from '../context-tree/context-tree.service';
import { PricingModule } from '../pricing/pricing.module';
import { PricingService } from '../pricing/pricing.service';
import type { DataStore } from '../supabase/data-store';
import { DATA_STORE, SupabaseModule } from '../supabase/supabase.module';
import { TemplateCascadeModule } from '../templates/template-cascade.module';
import { TemplateCascadeService } from '../templates/template-cascade.service';
import { CHAT_AGENT } from './chat-agent.port';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { CHAT_SESSIONS, InMemoryChatSessions } from './chat-session';
import { MastraChatAgent } from './mastra-chat.agent';
import { ShopTools } from './shop-tools';
import { StubChatAgent } from './stub-chat.agent';
import { SupabaseChatSessions } from './supabase-chat-sessions';
import type { Mastra } from '@mastra/core';
import { createEvaMastra } from '../mastra/create-eva-mastra';
import { EVA_SHOP_AGENT_KEY } from '../mastra/create-eva-mastra-agent';
import { EVA_MASTRA } from '../mastra/eva-mastra.token';
import { createEvaQualifierAgent } from '../mastra/intents/create-eva-qualifier-agent';
import { MastraIntentQualifier } from '../mastra/intents/mastra-intent-qualifier';
import {
  INTENT_SESSION_STATE,
  InMemoryIntentSessionState,
  type IntentSessionState,
} from '../mastra/intents/intent-session-state';

@Module({
  imports: [
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
      ) => new ShopTools(templates, pricing, contextTree),
      inject: [TemplateCascadeService, PricingService, ContextTreeService],
    },
    {
      provide: CHAT_SESSIONS,
      useFactory: (store: DataStore | undefined) =>
        store
          ? new SupabaseChatSessions(store)
          : new InMemoryChatSessions(() => randomUUID()),
      inject: [DATA_STORE],
    },
    ChatService,
    {
      provide: INTENT_SESSION_STATE,
      useClass: InMemoryIntentSessionState,
    },
    {
      provide: EVA_MASTRA,
      useFactory: (tools: ShopTools) =>
        process.env.DEEPSEEK_API_KEY
          ? createEvaMastra(tools)
          : undefined,
      inject: [ShopTools],
    },
    {
      provide: CHAT_AGENT,
      useFactory: (
        mastra: Mastra | undefined,
        tools: ShopTools,
        intentState: IntentSessionState,
      ) => {
        if (!mastra) {
          return new StubChatAgent(tools);
        }
        return new MastraChatAgent(
          mastra.getAgent(EVA_SHOP_AGENT_KEY),
          new MastraIntentQualifier(createEvaQualifierAgent()),
          intentState,
        );
      },
      inject: [EVA_MASTRA, ShopTools, INTENT_SESSION_STATE],
    },
  ],
  exports: [EVA_MASTRA],
})
export class ChatModule {}
