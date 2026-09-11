import { Module } from '@nestjs/common';
import { ContextTreeModule } from '../context-tree/context-tree.module';
import { ContextTreeService } from '../context-tree/context-tree.service';
import { PricingModule } from '../pricing/pricing.module';
import { PricingService } from '../pricing/pricing.service';
import { TemplateCascadeModule } from '../templates/template-cascade.module';
import { TemplateCascadeService } from '../templates/template-cascade.service';
import { CHAT_AGENT } from './chat-agent.port';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { MastraChatAgent } from './mastra-chat.agent';
import { ShopTools } from './shop-tools';
import { StubChatAgent } from './stub-chat.agent';

@Module({
  imports: [TemplateCascadeModule, PricingModule, ContextTreeModule],
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
    ChatService,
    {
      provide: CHAT_AGENT,
      useFactory: (tools: ShopTools) =>
        process.env.DEEPSEEK_API_KEY
          ? new MastraChatAgent(tools)
          : new StubChatAgent(tools),
      inject: [ShopTools],
    },
  ],
})
export class ChatModule {}
