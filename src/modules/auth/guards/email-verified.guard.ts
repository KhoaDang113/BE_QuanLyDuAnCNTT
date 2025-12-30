import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { EMAIL_VERIFIED_KEY } from '../decorators/email-verified.decorator';
import { JwtPayload } from 'jsonwebtoken';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../users/schemas/user.schema';

@Injectable()
export class EmailVerifiedGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requireEmailVerified = this.reflector.getAllAndOverride<boolean>(
      EMAIL_VERIFIED_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requireEmailVerified) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const payload = request.user as JwtPayload;
    if (!payload || !payload.id) {
      throw new ForbiddenException('User not authenticated');
    }

    try {
      const user = await this.userModel
        .findById(payload.id)
        .select('email emailVerifiedAt');
      if (!user) {
        throw new ForbiddenException('User not found');
      }

      if (!user.email) {
        return true;
      }

      if (user.email && !user.emailVerifiedAt) {
        throw new ForbiddenException('Email verification required');
      }
      return true;
    } catch (error) {
      console.log('error', error);
      throw new ForbiddenException('Failed to get user information');
    }
  }
}
