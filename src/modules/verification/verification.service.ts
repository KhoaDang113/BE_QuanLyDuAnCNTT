import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import {
  Verification,
  VerificationDocument,
} from './schema/verification.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { generateOtp } from './utils/otp.util';

const MAX_ATTEMPTS = 3;

@Injectable()
export class VerificationService {
  constructor(
    @InjectModel(Verification.name)
    private verificationModel: Model<VerificationDocument>,
  ) {}

  async generateOtp(
    email: string,
    type: string,
    size: number = 6,
    saltRounds: number = 10,
  ): Promise<string> {
    const otp = generateOtp(size);
    const codeHash = await bcrypt.hash(otp, saltRounds);
    const verification = new this.verificationModel({
      target: email,
      type,
      codeHash,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      attempts: 0,
    });

    await verification.save();

    return otp;
  }

  async validateOtp(
    email: string,
    code: string,
    type: string,
  ): Promise<boolean> {
    const v = await this.verificationModel
      .findOne({ target: email, type })
      .sort({ createdAt: -1 });
    if (!v) throw new HttpException('OTP not found', HttpStatus.UNAUTHORIZED);

    if (v.expiresAt.getTime() < Date.now()) {
      throw new HttpException('OTP expired', HttpStatus.UNAUTHORIZED);
    }
    if (v.attempts >= MAX_ATTEMPTS) {
      throw new HttpException('Too many attempts', HttpStatus.UNAUTHORIZED);
    }

    const ok = await bcrypt.compare(code, v.codeHash);
    v.attempts += 1;
    await v.save();

    if (!ok) throw new HttpException('Invalid OTP', HttpStatus.UNAUTHORIZED);

    return true;
  }
}
