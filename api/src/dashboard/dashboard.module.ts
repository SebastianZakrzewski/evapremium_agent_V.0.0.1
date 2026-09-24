import { Module } from '@nestjs/common';
import { AgentEventsModule } from '../agent-events/agent-events.module';
import { ChatModule } from '../chat/chat.module';
import { ContextTreeModule } from '../context-tree/context-tree.module';
import { DashboardAuthGuard } from './dashboard-auth.guard';
import { DashboardController } from './dashboard.controller';
import { DashboardQueryService } from './dashboard-query.service';

@Module({
  imports: [AgentEventsModule, ChatModule, ContextTreeModule],
  controllers: [DashboardController],
  providers: [DashboardQueryService, DashboardAuthGuard],
})
export class DashboardModule {}
