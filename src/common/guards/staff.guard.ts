import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtPayload } from '../../types/jwt-payload';

@Injectable()
export class StaffGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as JwtPayload;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    if (!user.role || !['admin', 'staff'].includes(user.role)) {
      throw new ForbiddenException(
        'Only staff or admin can access this resource',
      );
    }

    return true;
  }
}
