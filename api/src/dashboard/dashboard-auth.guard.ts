import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { dashboardBearerOk } from './dashboard-auth';

@Injectable()
export class DashboardAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      headers: { authorization?: string };
    }>();
    if (!dashboardBearerOk(request.headers.authorization)) {
      throw new UnauthorizedException();
    }
    return true;
  }
}
