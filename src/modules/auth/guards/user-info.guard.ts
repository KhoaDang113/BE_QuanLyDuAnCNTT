import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../users/schemas/user.schema';
import { JwtPayload } from 'jsonwebtoken';

@Injectable()
export class UserInfoGuard implements CanActivate {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const userPayload = request.user as JwtPayload;

    if (!userPayload || !userPayload.id) {
      throw new UnauthorizedException('User not authenticated');
    }

    try {
      const user = await this.userModel
        .findById(userPayload.id)
        .select('email emailVerifiedAt phone isPhoneVerified authProvider');

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      request.user = {
        ...userPayload,
        email: user.email,
        emailVerifiedAt: user.emailVerifiedAt,
        phone: user.phone,
        isPhoneVerified: user.isPhoneVerified,
        authProvider: user.authProvider,
      };

      return true;
    } catch (error) {
      console.log('error', error);
      throw new UnauthorizedException('Failed to get user information');
    }
  }
}
