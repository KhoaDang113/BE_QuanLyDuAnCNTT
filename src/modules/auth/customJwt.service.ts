import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { TokenExpiredError } from 'jsonwebtoken';

@Injectable()
export class CustomJwtService {
  private readonly accessTokenSecret =
    process.env.JWT_ACCESS_SECRET || 'your-access-secret';
  private readonly refreshTokenSecret =
    process.env.JWT_REFRESH_SECRET || 'your-refresh-secret';
  private readonly accessTokenExpiry = '15m';
  private readonly refreshTokenExpiry = '7d';

  signAccessToken(userId: string, role?: string): string {
    return jwt.sign(
      { id: userId, type: 'access', role },
      this.accessTokenSecret,
      {
        expiresIn: this.accessTokenExpiry,
      },
    );
  }

  signRefreshToken(userId: string): string {
    return jwt.sign({ id: userId, type: 'refresh' }, this.refreshTokenSecret, {
      expiresIn: this.refreshTokenExpiry,
    });
  }

  verifyAccessToken(token: string): any {
    try {
      return jwt.verify(token, this.accessTokenSecret);
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        throw new UnauthorizedException('ACCESS_TOKEN_EXPIRED');
      }

      throw new UnauthorizedException('INVALID_ACCESS_TOKEN');
    }
  }

  verifyRefreshToken(token: string): any {
    try {
      return jwt.verify(token, this.refreshTokenSecret);
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        throw new UnauthorizedException('REFRESH_TOKEN_EXPIRED');
      }

      throw new UnauthorizedException('INVALID_REFRESH_TOKEN');
    }
  }
}
