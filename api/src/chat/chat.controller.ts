import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpException,
  NotFoundException,
  Param,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import * as Sentry from '@sentry/nestjs';
import { apiHealth } from './api-health';
import { ChatService } from './chat.service';
import type { CreatedChatSession } from './session-opener';
import { TurnBudgetExceededError } from './session-turn-budget';
import { encodeSse } from './sse';
import { reportUnexpectedError } from '../observability/report-unexpected-error';
import {
  sentryDebugError,
  sentryDebugProbeEnabled,
} from '../observability/sentry-debug-probe';

@Controller('v1')
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Get('health')
  health(): { status: 'ok'; probe: string } {
    return apiHealth();
  }

  @Get('debug-sentry')
  debugSentry(): never {
    if (!sentryDebugProbeEnabled()) {
      throw new NotFoundException();
    }
    throw sentryDebugError();
  }

  @Post('sessions')
  async createSession(@Req() req: Request): Promise<CreatedChatSession> {
    try {
      return await this.chat.createSession(req.ip ?? '');
    } catch (error) {
      if (error instanceof TurnBudgetExceededError) {
        throw new HttpException({ error: 'turn_budget_exceeded' }, 429);
      }
      throw error;
    }
  }

  @Post('sessions/:sessionId/messages')
  async postMessage(
    @Param('sessionId') sessionId: string,
    @Body() body: { message?: string },
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const message = body.message?.trim();
    if (!message) {
      throw new BadRequestException('message is required');
    }
    try {
      await this.chat.acceptTurn(sessionId, message, req.ip ?? '');
    } catch (error) {
      if (error instanceof TurnBudgetExceededError) {
        res.status(429).json({ error: 'turn_budget_exceeded' });
        return;
      }
      throw error;
    }
    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
    try {
      for await (const frame of this.chat.streamMessage(sessionId, message)) {
        res.write(encodeSse(frame));
      }
    } catch (error) {
      reportUnexpectedError(error, (exception) => {
        Sentry.captureException(exception);
      });
      const messageText =
        error instanceof Error ? error.message : 'stream_failed';
      res.write(encodeSse({ event: 'error', data: { message: messageText } }));
    }
    res.end();
  }
}
