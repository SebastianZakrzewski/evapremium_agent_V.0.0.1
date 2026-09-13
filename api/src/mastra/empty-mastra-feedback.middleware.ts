import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import {
  emptyMastraFeedbackList,
  isMastraFeedbackListRequest,
} from './studio-http';

@Injectable()
export class EmptyMastraFeedbackMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    if (!isMastraFeedbackListRequest(req.method, req.path)) {
      next();
      return;
    }
    const mode = typeof req.query.mode === 'string' ? req.query.mode : undefined;
    res.status(200).json(emptyMastraFeedbackList(mode));
  }
}
