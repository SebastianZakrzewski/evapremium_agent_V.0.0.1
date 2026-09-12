import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import * as Sentry from '@sentry/nestjs';
import { apiHealth } from './api-health';
import { ChatService } from './chat.service';
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
  createSession(): Promise<{ sessionId: string }> {
    return this.chat.createSession();
  }

  @Post('sessions/:sessionId/messages')
  async postMessage(
    @Param('sessionId') sessionId: string,
    @Body() body: { message?: string },
    @Res() res: Response,
  ): Promise<void> {
    const message = body.message?.trim();
    if (!message) {
      throw new BadRequestException('message is required');
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
