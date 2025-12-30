import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { CustomJwtService } from '../../modules/auth/customJwt.service';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { JwtPayload } from '../../types/jwt-payload';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private jwtService: CustomJwtService,
    private reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();

    let token = request.cookies?.accessToken as string;

    if (!token) {
      const authHeader = request.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      throw new UnauthorizedException('Access token not provided');
    }

    try {
      const payload = this.jwtService.verifyAccessToken(token) as JwtPayload;

      if (payload.type !== 'access') {
        throw new UnauthorizedException('Invalid token type');
      }

      request.user = payload;
      return true;
    } catch (error) {
      console.log('JWT Guard error:', error);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
