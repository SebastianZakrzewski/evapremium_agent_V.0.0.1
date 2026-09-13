import { Module } from '@nestjs/common';
import { AgentEventsModule } from '../agent-events/agent-events.module';
import { ChatModule } from '../chat/chat.module';
import { DashboardAuthGuard } from './dashboard-auth.guard';
import { DashboardController } from './dashboard.controller';
import { DashboardQueryService } from './dashboard-query.service';

@Module({
  imports: [AgentEventsModule, ChatModule],
  controllers: [DashboardController],
  providers: [DashboardQueryService, DashboardAuthGuard],
})
export class DashboardModule {}
