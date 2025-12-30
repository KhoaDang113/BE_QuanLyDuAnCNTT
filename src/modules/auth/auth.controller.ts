import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  HttpStatus,
  HttpException,
  UseGuards,
  Put,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { EmailVerifiedGuard } from './guards/email-verified.guard';
import { EmailVerified } from './decorators/email-verified.decorator';
import { AuthGuard } from '@nestjs/passport';
import { RegisterPhoneDto, VerifyCodeDto, LoginEmailDto } from './dto/auth.dto';
import { RegisterEmailDto } from './dto/register-email.dto';
import { Public } from '../../common/decorators/public.decorator';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { LoginPhoneDto } from './dto/login-phone.dto';
import { VerifyLoginSmsDto } from './dto/verify-login-sms.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordWithTokenDto } from './dto/reset-password-with-token.dto';
import { ChangePasswordDto } from './dto/change-Password.dto';
import { AssignmentService } from '../chat/assignment.service';
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly assignment: AssignmentService,
  ) { }

  @Public()
  @Post('register-email')
  async registerEmail(
    @Body() registerDto: RegisterEmailDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const userAgent = req.get('User-Agent') || 'Unknown';
    const ipAddress = req.ip || req.socket.remoteAddress;

    const { user, accessToken, refreshToken } =
      await this.authService.registerEmail(
        registerDto.email,
        registerDto.password,
        registerDto.name,
        userAgent,
        ipAddress as string,
      );

    this.setTokenCookies(res, accessToken, refreshToken);

    return res.status(HttpStatus.CREATED).json({
      success: true,
      token: accessToken,
      user: {
        id: user._id?.toString(),
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        isPhoneVerified: user.isPhoneVerified,
        role: user.role,
      },
    });
  }

  @Public()
  @Post('verify-email')
  async verifyEmail(@Body() verifyDto: VerifyEmailDto) {
    return this.authService.verifyEmailOtp(verifyDto.email, verifyDto.code);
  }
  // Phân quyền admin, staff, user
  @Public()
  @Post('register-phone')
  async registerPhone(@Body() registerDto: RegisterPhoneDto) {
    const { user, userId } = await this.authService.registerPhone(
      registerDto.phone,
      registerDto.name,
    );

    return {
      success: true,
      message: 'Verification code sent to your phone',
      userId: userId,
      user,
    };
  }

  @Public()
  @Post('verify-code')
  async verifyCode(
    @Body() verifyDto: VerifyCodeDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const userAgent = req.get('User-Agent') || 'Unknown';
      const ipAddress = req.ip || req.socket.remoteAddress;

      const { user, accessToken, refreshToken } =
        await this.authService.verifyCode(
          verifyDto.userId,
          verifyDto.code,
          userAgent,
          ipAddress as string,
        );

      this.setTokenCookies(res, accessToken, refreshToken);

      return res.json({
        success: true,
        accessToken,
        user: {
          id: user._id,
          name: user.name,
          phone: user.phone,
          isVerified: user.isVerified,
          avatar: user.avatar,
          role: user.role,
        },
      });
    } catch (error) {
      console.log('error', error);
      throw new HttpException('Server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Public()
  @Post('login-email')
  async loginEmail(
    @Body() loginDto: LoginEmailDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const userAgent = req.get('User-Agent') || 'Unknown';
    const ipAddress = req.ip || req.socket.remoteAddress;
    const { user, accessToken, refreshToken } =
      await this.authService.loginEmail(
        loginDto.email,
        loginDto.password,
        userAgent,
        ipAddress as string,
      );

    if (!user.emailVerifiedAt && user.email) {
      await this.authService.createEmailVerification(user.email);

      return res.status(HttpStatus.OK).json({
        success: true,
        message:
          'Email verification required. Please check your email for OTP.',
        requiresEmailVerification: true,
        user: {
          id: user._id?.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    }

    this.setTokenCookies(res, accessToken, refreshToken);

    return res.json({
      success: true,
      accessToken,
      user: {
        id: user._id?.toString(),
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        isPhoneVerified: user.isPhoneVerified,
        role: user.role,
      },
    });
  }

  @Public()
  @Post('refresh-token')
  async refreshToken(@Req() req: Request, @Res() res: Response) {
    const refreshToken = req?.cookies.refreshToken as string;
    if (!refreshToken) {
      throw new HttpException(
        'Refresh token not provided',
        HttpStatus.UNAUTHORIZED,
      );
    }
    try {
      const { accessToken } = await this.authService.refreshToken(refreshToken);

      res.cookie('accessToken', accessToken, {
        httpOnly: true,
        maxAge: 15 * 60 * 1000,
      });

      return res.status(HttpStatus.OK).json({
        success: true,
        accessToken,
      });
    } catch (error) {
      console.log('error', error);
      throw new HttpException('Invalid refresh token', HttpStatus.UNAUTHORIZED);
    }
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res() res: Response) {
    const refreshToken: string = req.cookies?.refreshToken as string;
    if (!refreshToken) {
      throw new HttpException(
        'Refresh token not provided',
        HttpStatus.UNAUTHORIZED,
      );
    }
    try {
      const userId = String(req?.user?.id);
      await this.authService.logout(refreshToken);
      if (userId) {
        await this.assignment.closeUserConversation(userId);
      }
      res.clearCookie('refreshToken');
      res.clearCookie('accessToken');
      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      console.log('error', error);
      res.clearCookie('refreshToken');
      res.clearCookie('accessToken');
      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'Logged out successfully',
      });
    }
  }

  @Post('logout-all')
  @UseGuards(EmailVerifiedGuard)
  @EmailVerified()
  async logoutAll(@Req() req: Request, @Res() res: Response) {
    const userId = req.user?.id as string;
    if (!userId)
      throw new HttpException('User not found', HttpStatus.UNAUTHORIZED);
    try {
      await this.authService.logoutAll(userId);
      res.clearCookie('refreshToken');
      res.clearCookie('accessToken');
      return res.json({
        success: true,
        message: 'Logged out from all devices',
      });
    } catch (error) {
      console.log('error', error);
      throw new HttpException('Server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Public()
  @Post('resend-email-verification')
  async resendEmailVerification(@Body() body: { email: string }) {
    try {
      await this.authService.createEmailVerification(body.email);
      return {
        success: true,
        message: 'Verification email sent successfully',
      };
    } catch (error) {
      console.log('error', error);
      throw new HttpException('Server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {
    return { msg: 'Google authentication ' };
  }

  @Public()
  @Get('google-callback')
  @UseGuards(AuthGuard('google'))
  googleAuthCallback(@Req() req: Request, @Res() res: Response) {
    const user = req.user;

    if (!user) {
      throw new HttpException(
        'Google authentication failed',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const accessToken = this.authService['jwtService'].signAccessToken(
      user._id as string,
      user.role as string,
    );
    const refreshToken = this.authService['jwtService'].signRefreshToken(
      user._id as string,
    );

    this.setTokenCookies(res, accessToken, refreshToken);

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    return res.redirect(`${frontendUrl}/auth-callback`);
  }

  @Public()
  @Post('login-phone')
  async loginPhone(
    @Body() body: LoginPhoneDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const result = await this.authService.loginPhone(body.phone);

    return res.json({
      success: true,
      message: result.message,
      userId: result.userId,
    });
  }

  @Public()
  @Post('verify-login-sms')
  async verifyLoginSms(
    @Body() body: VerifyLoginSmsDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const userAgent = req.get('User-Agent') || 'Unknown';
    const ipAddress = req.ip || req.socket.remoteAddress;

    try {
      const { user, accessToken, refreshToken } =
        await this.authService.verifyLoginSms(
          body.userId,
          body.code,
          userAgent,
          ipAddress as string,
        );

      this.setTokenCookies(res, accessToken, refreshToken);

      return res.json({
        success: true,
        accessToken,
        user: {
          id: user._id?.toString(),
          name: user.name,
          phone: user.phone,
          isPhoneVerified: user.isPhoneVerified,
        },
      });
    } catch (error) {
      console.log('error', error);
      throw new HttpException('Server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Public()
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.sendResetPasswordOTP(dto.email);
  }

  @Public()
  @Post('verify-reset-password')
  async verifyResetPassword(@Body() dto: VerifyEmailDto, @Res() res: Response) {
    const result = await this.authService.verifyResetPasswordOTP(
      dto.email,
      dto.code,
    );

    res.cookie('resetToken', result.resetToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    });

    return res.json({
      success: result.success,
      message: result.message,
    });
  }

  @Public()
  @Post('reset-password')
  async resetPassword(
    @Body() dto: ResetPasswordWithTokenDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const resetToken = (req.cookies?.resetToken as string) || dto.resetToken;

    const result = await this.authService.resetPassword(
      dto.email,
      resetToken,
      dto.newPassword,
    );

    res.clearCookie('resetToken');

    return res.json(result);
  }

  @Get('me')
  @UseGuards(EmailVerifiedGuard)
  @EmailVerified()
  async getMe(@Req() req: Request) {
    const userId = req.user?.id as string;
    if (!userId)
      throw new HttpException('User not found', HttpStatus.UNAUTHORIZED);
    try {
      const user = await this.authService.getMe(userId);
      return { success: true, user };
    } catch (error) {
      console.log('error', error);
      throw new HttpException('Server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Put('change-password')
  async changePassword(@Body() dto: ChangePasswordDto, @Req() req: Request) {
    const userId = req.user?.id as string;
    if (!userId)
      throw new HttpException('User not found', HttpStatus.UNAUTHORIZED);
    return this.authService.changePassword(
      userId,
      dto.oldPassword,
      dto.newPassword,
    );
  }

  private setTokenCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
  ) {
    res.cookie('accessToken', accessToken, {
      httpOnly: false,
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }
}
