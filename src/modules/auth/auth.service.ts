import {
  Injectable,
  HttpException,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from '../users/schemas/user.schema';
import {
  RefreshToken,
  RefreshTokenDocument,
} from '../refresh-tokens/schemas/refresh-token.schema';
import { CustomJwtService } from './customJwt.service';
import { RefreshTokenService } from '../refresh-tokens/refresh-token.service';
import { SmsService } from '../../shared/sms/sms.service';
import { JwtPayload } from 'jsonwebtoken';
import { RegisterEmailResponseDto } from './dto/register-email-response.dto';
import { VerificationService } from '../verification/verification.service';
import {
  Verification,
  VerificationDocument,
} from '../verification/schema/verification.schema';
import { MailerService } from '../../shared/mailer/mailer.service';
import { ValidateGoogleUserDto } from './dto/validate-google-user.dto';

const OTP_TTL_MIN = 5;
const OTP_LEN = 6;
const OTP_SALT_ROUNDS = 10;
const RESEND_WINDOW_SEC = 60;

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(RefreshToken.name)
    private refreshTokenModel: Model<RefreshTokenDocument>,
    @InjectModel(Verification.name)
    private verificationModel: Model<VerificationDocument>,
    private jwtService: CustomJwtService,
    private refreshTokenService: RefreshTokenService,
    private smsService: SmsService,
    private verificationService: VerificationService,
    private mailer: MailerService,
  ) {}

  private async sendEmailOtp(email: string, code: string) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const verifyUrl = `${frontendUrl}/verify-email?email=${encodeURIComponent(email)}&code=${code}`;

    const html = `
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Mã xác thực đăng ký</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
        <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <!-- Header -->
                <tr>
                  <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #00A859 0%, #00C853 100%); border-radius: 12px 12px 0 0;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">Mã xác thực đăng ký</h1>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px;">
                    <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                      Xin chào,
                    </p>
                    <p style="margin: 0 0 30px; color: #666666; font-size: 16px; line-height: 1.6;">
                      Cảm ơn bạn đã đăng ký tài khoản. Vui lòng sử dụng mã OTP bên dưới để xác thực email của bạn.
                    </p>
                    
                    <!-- OTP Box -->
                    <div style="background: linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%); border-radius: 8px; padding: 30px; text-align: center; margin: 30px 0;">
                      <p style="margin: 0 0 15px; color: #666666; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Mã xác thực của bạn</p>
                      <div style="font-size: 36px; font-weight: 700; color: #00A859; letter-spacing: 8px; margin: 15px 0; font-family: 'Courier New', monospace;">${code}</div>
                      <a href="${verifyUrl}" target="_self" style="display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #00A859 0%, #00C853 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600; margin-top: 15px; transition: transform 0.2s; box-shadow: 0 2px 4px rgba(0, 168, 89, 0.3);">
                        Xác nhận & sao chép OTP
                      </a>
                    </div>
                    
                    <p style="margin: 30px 0 0; color: #999999; font-size: 14px; text-align: center;">
                      ⏱️ Mã này có hiệu lực trong <strong style="color: #00A859;">${OTP_TTL_MIN} phút</strong>
                    </p>
                    
                    <p style="margin: 30px 0 0; color: #999999; font-size: 12px; line-height: 1.6;">
                      <strong>Lưu ý:</strong> Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này. Mã OTP sẽ tự động hết hạn sau ${OTP_TTL_MIN} phút.
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="padding: 30px 40px; background-color: #f8f9fa; border-radius: 0 0 12px 12px; text-align: center;">
                    <p style="margin: 0; color: #999999; font-size: 12px;">
                      © ${new Date().getFullYear()} Siêu thị. Tất cả quyền được bảo lưu.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>`;
    await this.mailer.sendEmail({
      to: email,
      subject: 'Xác thực đăng ký',
      html,
    });
  }

  private async sendResetPasswordEmail(email: string, code: string) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/forgot-password?email=${encodeURIComponent(email)}&code=${code}`;

    const html = `
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Mã xác thực đặt lại mật khẩu</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
        <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <!-- Header -->
                <tr>
                  <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #00A859 0%, #00C853 100%); border-radius: 12px 12px 0 0;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">Đặt lại mật khẩu</h1>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px;">
                    <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                      Xin chào,
                    </p>
                    <p style="margin: 0 0 30px; color: #666666; font-size: 16px; line-height: 1.6;">
                      Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Vui lòng sử dụng mã OTP bên dưới để xác thực và tiếp tục quá trình đặt lại mật khẩu.
                    </p>
                    
                    <!-- OTP Box -->
                    <div style="background: linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%); border-radius: 8px; padding: 30px; text-align: center; margin: 30px 0;">
                      <p style="margin: 0 0 15px; color: #666666; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Mã xác thực của bạn</p>
                      <div style="font-size: 36px; font-weight: 700; color: #00A859; letter-spacing: 8px; margin: 15px 0; font-family: 'Courier New', monospace;">${code}</div>
                      <a href="${resetUrl}" target="_self" style="display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #00A859 0%, #00C853 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600; margin-top: 15px; transition: transform 0.2s; box-shadow: 0 2px 4px rgba(0, 168, 89, 0.3);">
                        Xác nhận & sao chép OTP
                      </a>
                    </div>
                    
                    <p style="margin: 30px 0 0; color: #999999; font-size: 14px; text-align: center;">
                      ⏱️ Mã này có hiệu lực trong <strong style="color: #00A859;">${OTP_TTL_MIN} phút</strong>
                    </p>
                    
                    <div style="background-color: #E8F5E9; border-left: 4px solid #00A859; padding: 15px; margin: 30px 0; border-radius: 4px;">
                      <p style="margin: 0; color: #2E7D32; font-size: 13px; line-height: 1.6;">
                        <strong>⚠️ Cảnh báo bảo mật:</strong> Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này và kiểm tra bảo mật tài khoản của bạn ngay lập tức.
                      </p>
                    </div>
                    
                    <p style="margin: 20px 0 0; color: #999999; font-size: 12px; line-height: 1.6;">
                      Mã OTP sẽ tự động hết hạn sau ${OTP_TTL_MIN} phút. Vui lòng không chia sẻ mã này với bất kỳ ai.
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="padding: 30px 40px; background-color: #f8f9fa; border-radius: 0 0 12px 12px; text-align: center;">
                    <p style="margin: 0; color: #999999; font-size: 12px;">
                      © ${new Date().getFullYear()} Siêu thị. Tất cả quyền được bảo lưu.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>`;
    await this.mailer.sendEmail({
      to: email,
      subject: 'Xác thực đặt lại mật khẩu',
      html,
    });
  }

  async registerEmail(
    email: string,
    password: string,
    name: string,
    userAgent: string,
    ipAddress: string,
  ): Promise<RegisterEmailResponseDto> {
    const existingUser = await this.userModel.findOne({ email });
    if (existingUser) {
      throw new HttpException('Email already registered', HttpStatus.CONFLICT);
    }

    const existingName = await this.userModel.findOne({ name });
    if (existingName) {
      throw new BadRequestException('Tên này đã được sử dụng');
    }

    const newUser = new this.userModel({
      email,
      password,
      name,
      authProvider: 'local',
    });

    await newUser.save();

    await this.createEmailVerification(email);

    const accessToken = this.jwtService.signAccessToken(
      newUser._id.toString(),
      newUser.role,
    );
    const refreshToken = this.jwtService.signRefreshToken(
      newUser._id.toString(),
    );

    await this.refreshTokenService.addRefreshToken(
      newUser._id.toString(),
      refreshToken,
      userAgent,
      ipAddress,
    );

    return { user: newUser, accessToken, refreshToken };
  }

  async createEmailVerification(email: string, type: string = 'email_otp') {
    const latest = await this.verificationModel
      .findOne({ target: email, type })
      .sort({ createdAt: -1 })
      .lean();

    if (latest && latest.createdAt) {
      const deltaSec =
        (Date.now() - new Date(latest.createdAt).getTime()) / 1000;
      if (deltaSec < RESEND_WINDOW_SEC) {
        throw new BadRequestException(
          `Please wait ${Math.ceil(RESEND_WINDOW_SEC - deltaSec)}s to resend OTP`,
        );
      }
    }

    const otp = await this.verificationService.generateOtp(
      email,
      type,
      OTP_LEN,
      OTP_SALT_ROUNDS,
    );

    if (type === 'email_otp') {
      await this.sendEmailOtp(email, otp);
    } else if (type === 'reset_password') {
      await this.sendResetPasswordEmail(email, otp);
    }
    return { success: true };
  }

  async verifyEmailOtp(email: string, code: string) {
    await this.verificationService.validateOtp(email, code, 'email_otp');

    await this.userModel.updateOne(
      {
        email: email.toLowerCase(),
        $or: [
          { emailVerifiedAt: { $exists: false } },
          { emailVerifiedAt: null },
        ],
      },
      { $set: { emailVerifiedAt: new Date() } },
    );

    await this.verificationModel.deleteMany({
      target: email,
      type: 'email_otp',
    });

    return { success: true };
  }

  private generateVerificationCode(): number {
    return Math.floor(100000 + Math.random() * 900000);
  }

  async registerPhone(phone: string, name: string) {
    const existingUser = await this.userModel.findOne({ phone });
    if (existingUser) {
      throw new HttpException(
        'Phone number already registered',
        HttpStatus.CONFLICT,
      );
    }

    const newUser = new this.userModel({
      phone,
      name,
      authProvider: 'local',
    });

    const verificationCode = this.generateVerificationCode();
    newUser.phoneVerificationCode = verificationCode;
    newUser.phoneVerificationExpires = new Date(Date.now() + 10 * 60 * 1000);

    await newUser.save();

    const smsResult = await this.smsService.sendVerificationCode(
      phone,
      verificationCode,
    );
    if (!smsResult.success) {
      throw new HttpException(
        'Failed to send verification code',
        HttpStatus.BAD_REQUEST,
      );
    }

    return { user: newUser, userId: newUser._id };
  }

  async verifyCode(
    userId: string,
    code: number,
    userAgent: string,
    ipAddress: string,
  ) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    if (
      user.phoneVerificationCode !== code ||
      !user.phoneVerificationExpires ||
      user.phoneVerificationExpires < new Date(Date.now())
    ) {
      throw new HttpException(
        'Invalid or expired verification code',
        HttpStatus.BAD_REQUEST,
      );
    }

    user.isPhoneVerified = true;
    user.phoneVerificationCode = undefined as unknown as number;
    user.phoneVerificationExpires = undefined as unknown as Date;
    await user.save();

    const accessToken = this.jwtService.signAccessToken(
      user._id.toString(),
      user.role,
    );
    const refreshToken = this.jwtService.signRefreshToken(user._id.toString());

    await this.refreshTokenService.addRefreshToken(
      user._id.toString(),
      refreshToken,
      userAgent,
      ipAddress,
    );

    return { user, accessToken, refreshToken };
  }

  async loginEmail(
    email: string,
    password: string,
    userAgent: string,
    ipAddress: string,
  ): Promise<{ user: User; accessToken: string; refreshToken: string }> {
    const user = await this.userModel.findOne({ email }).select('+password');
    if (!user) {
      throw new HttpException('user not found', HttpStatus.UNAUTHORIZED);
    }

    if (!user.password) {
      throw new HttpException('password not found', HttpStatus.UNAUTHORIZED);
    }

    const isMatch = await this.comparePassword(password, user.password);
    if (!isMatch) {
      throw new HttpException('password wrong', HttpStatus.UNAUTHORIZED);
    }

    if (!user.emailVerifiedAt && user.email) {
      // Gửi OTP xác thực email
      await this.createEmailVerification(user.email);

      throw new HttpException(
        'Email verification required. Please check your email for OTP.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const accessToken = this.jwtService.signAccessToken(
      user._id.toString(),
      user.role,
    );
    const refreshToken = this.jwtService.signRefreshToken(user._id.toString());

    await this.refreshTokenService.addRefreshToken(
      user._id.toString(),
      refreshToken,
      userAgent,
      ipAddress,
    );

    return { user, accessToken, refreshToken };
  }

  async loginPhone(phone: string) {
    const user = await this.userModel.findOne({ phone });
    if (!user) {
      throw new HttpException('Phone number not found', HttpStatus.NOT_FOUND);
    }

    const smsCode = this.generateVerificationCode();
    user.loginSmsCode = smsCode;
    user.loginSmsExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await user.save();

    const smsResult = await this.smsService.sendVerificationCode(
      phone,
      smsCode,
    );
    if (!smsResult.success) {
      throw new HttpException(
        'Failed to send verification code',
        HttpStatus.BAD_REQUEST,
      );
    }

    return {
      success: true,
      message: 'Verification code sent to your phone',
      userId: user._id,
    };
  }

  async verifyLoginSms(
    userId: string,
    code: number,
    userAgent: string,
    ipAddress: string,
  ) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    if (
      user.loginSmsCode !== code ||
      !user.loginSmsExpires ||
      user.loginSmsExpires < new Date()
    ) {
      throw new HttpException(
        'Invalid or expired verification code',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Xóa SMS code sau khi xác thực thành công
    user.loginSmsCode = undefined as unknown as number;
    user.loginSmsExpires = undefined as unknown as Date;
    await user.save();

    const accessToken = this.jwtService.signAccessToken(
      user._id.toString(),
      user.role,
    );
    const refreshToken = this.jwtService.signRefreshToken(user._id.toString());

    await this.refreshTokenService.addRefreshToken(
      user._id.toString(),
      refreshToken,
      userAgent,
      ipAddress,
    );

    return { user, accessToken, refreshToken };
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    const decoded: JwtPayload = this.jwtService.verifyRefreshToken(
      refreshToken,
    ) as JwtPayload;
    if (decoded.type !== 'refresh') {
      throw new HttpException('Invalid token type', HttpStatus.UNAUTHORIZED);
    }

    const user = await this.userModel.findById(decoded.id);
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    const newAccessToken = this.jwtService.signAccessToken(
      user._id.toString(),
      user.role,
    );
    return { accessToken: newAccessToken };
  }

  async logout(refreshToken: string): Promise<void> {
    const decoded: JwtPayload = this.jwtService.verifyRefreshToken(
      refreshToken,
    ) as JwtPayload;
    if (decoded.type !== 'refresh') {
      throw new HttpException('Invalid token type', HttpStatus.UNAUTHORIZED);
    }

    await this.refreshTokenModel.deleteOne({
      userId: decoded.id,
      token: refreshToken,
    });
  }

  async logoutAll(userId: string) {
    await this.refreshTokenService.removeAllRefreshTokens(userId);
    return true;
  }

  async getMe(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .select(
        '-password -refreshTokens -verificationCode -verificationExpires -resetPasswordToken -resetPasswordExpires -__v',
      );
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    return user;
  }

  private async comparePassword(
    candidatePassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return await bcrypt.compare(candidatePassword, hashedPassword);
  }

  async validateGoogleUser(googleUser: ValidateGoogleUserDto) {
    let user = await this.userModel.findOne({
      providerId: googleUser.providerId,
      authProvider: 'google',
    });

    if (user) {
      return user;
    }

    user = await this.userModel.findOne({ email: googleUser.email });

    if (user) {
      user.providerId = googleUser.providerId;
      user.authProvider = 'google';
      user.avatar = googleUser.avatar;
      await user.save();
      return user;
    }

    const newUser = new this.userModel({
      name: googleUser.name,
      email: googleUser.email,
      avatar: googleUser.avatar,
      authProvider: 'google',
      providerId: googleUser.providerId,
      emailVerifiedAt: new Date(),
    });

    await newUser.save();
    return newUser;
  }

  async sendResetPasswordOTP(email: string) {
    if (!email) {
      throw new HttpException('Email not found', HttpStatus.NOT_FOUND);
    }

    await this.createEmailVerification(email, 'reset_password');

    return { success: true, message: 'Reset password OTP sent successfully' };
  }

  async verifyResetPasswordOTP(
    email: string,
    code: string,
  ): Promise<{ success: boolean; message: string; resetToken: string }> {
    await this.verificationService.validateOtp(email, code, 'reset_password');

    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    const resetToken = this.jwtService.signAccessToken(
      user._id.toString(),
      'reset_password',
    );
    const resetTokenExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetTokenExpires;
    await user.save();

    await this.verificationModel.deleteMany({
      target: email,
      type: 'reset_password',
    });

    return {
      success: true,
      message: 'Reset password OTP verified successfully',
      resetToken: resetToken,
    };
  }

  async resetPassword(
    email: string,
    resetToken: string,
    newPassword: string,
  ): Promise<{ success: boolean; message: string }> {
    const user = await this.userModel.findOne({ email }).select('+password');
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    if (!user.resetPasswordToken || user.resetPasswordToken !== resetToken) {
      throw new HttpException('Invalid reset token', HttpStatus.UNAUTHORIZED);
    }

    if (
      !user.resetPasswordExpires ||
      user.resetPasswordExpires.getTime() < Date.now()
    ) {
      throw new HttpException('Reset token expired', HttpStatus.UNAUTHORIZED);
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined as unknown as string;
    user.resetPasswordExpires = undefined as unknown as Date;
    await user.save();

    return {
      success: true,
      message: 'Password reset successfully',
    };
  }

  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ) {
    const user = await this.userModel.findById(userId).select('+password');
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    const isMatch = await this.comparePassword(
      oldPassword,
      user.password as string,
    );

    if (!isMatch) {
      throw new HttpException(
        'Old password is incorrect',
        HttpStatus.UNAUTHORIZED,
      );
    }

    user.password = newPassword;
    await user.save();
    return {
      success: true,
      message: 'Password changed successfully',
    };
  }
}
