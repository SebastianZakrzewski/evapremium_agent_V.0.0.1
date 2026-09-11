import { BadRequestException, Body, Controller, Param, Post } from '@nestjs/common';
import { ChatService } from './chat.service';

@Controller('v1')
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Post('sessions')
  createSession(): { sessionId: string } {
    return this.chat.createSession();
  }

  @Post('sessions/:sessionId/messages')
  postMessage(
    @Param('sessionId') sessionId: string,
    @Body() body: { message?: string },
  ) {
    const message = body.message?.trim();
    if (!message) {
      throw new BadRequestException('message is required');
    }
    return this.chat.postMessage(sessionId, message);
  }
}
