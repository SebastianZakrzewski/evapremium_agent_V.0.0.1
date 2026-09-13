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
