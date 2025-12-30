import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtPayload } from '../../types/jwt-payload';
import { Reflector } from '@nestjs/core';
import { SKIP_SHIPPER_GUARD } from '../decorators/skip-shipper-guard.decorator';

@Injectable()
export class ShipperGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_SHIPPER_GUARD, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as JwtPayload;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    if (!user.role || user.role !== 'shipper') {
      throw new ForbiddenException('Only shippers can access this resource');
    }

    return true;
  }
}
