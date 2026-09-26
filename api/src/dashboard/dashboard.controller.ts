import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DashboardAuthGuard } from './dashboard-auth.guard';
import { DashboardQueryService } from './dashboard-query.service';
import type { SessionMarker } from './dashboard-read';

@Controller('v1/dashboard')
@UseGuards(DashboardAuthGuard)
export class DashboardController {
  constructor(private readonly queries: DashboardQueryService) {}

  @Get('summary')
  summary(@Query('date') date: string) {
    return this.queries.summary(date);
  }

  @Get('analytics')
  analytics(@Query('date') date: string) {
    return this.queries.analytics(date);
  }

  @Get('context-graph')
  contextGraph() {
    return this.queries.contextGraph();
  }

  @Get('context-activity')
  contextActivity(@Query('since') since?: string) {
    return this.queries.contextActivity(since);
  }

  @Get('container-log')
  containerLog(@Query('after') after?: string, @Query('since') since?: string) {
    return this.queries.containerLog(after, since);
  }

  @Get('sessions')
  listSessions(
    @Query('date') date: string,
    @Query('marker') marker?: SessionMarker,
  ) {
    return this.queries.listSessions(date, marker);
  }

  @Get('sessions/:sessionId')
  session(@Param('sessionId') sessionId: string) {
    return this.queries.session(sessionId);
  }
}
