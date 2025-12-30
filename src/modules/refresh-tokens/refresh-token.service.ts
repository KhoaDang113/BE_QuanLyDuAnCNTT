import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  RefreshToken,
  RefreshTokenDocument,
} from './schemas/refresh-token.schema';

@Injectable()
export class RefreshTokenService {
  constructor(
    @InjectModel(RefreshToken.name)
    private refreshTokenModel: Model<RefreshTokenDocument>,
  ) {}

  async addRefreshToken(
    userId: string,
    token: string,
    userAgent: string,
    ipAddress: string,
  ): Promise<void> {
    const refreshToken = new this.refreshTokenModel({
      userId,
      token,
      userAgent,
      ipAddress,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    await refreshToken.save();
  }

  async removeRefreshToken(userId: string, token: string): Promise<void> {
    await this.refreshTokenModel.deleteOne({ userId, token });
  }

  async removeAllRefreshTokens(userId: string): Promise<void> {
    await this.refreshTokenModel.deleteMany({ userId });
  }

  async findRefreshToken(token: string): Promise<RefreshToken | null> {
    return await this.refreshTokenModel.findOne({ token });
  }

  async cleanupExpiredTokens(): Promise<void> {
    await this.refreshTokenModel.deleteMany({
      expiresAt: { $lt: new Date() },
    });
  }
}
