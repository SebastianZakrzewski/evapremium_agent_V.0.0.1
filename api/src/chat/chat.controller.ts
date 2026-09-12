import {
  BadRequestException,
  Body,
  Controller,
  Param,
  Post,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ChatService } from './chat.service';
import { encodeSse } from './sse';

@Controller('v1')
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Post('sessions')
  createSession(): { sessionId: string } {
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
      const messageText =
        error instanceof Error ? error.message : 'stream_failed';
      res.write(encodeSse({ event: 'error', data: { message: messageText } }));
    }
    res.end();
  }
}
