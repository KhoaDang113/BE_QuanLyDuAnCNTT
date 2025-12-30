import { Injectable } from '@nestjs/common';
import twilio from 'twilio';

@Injectable()
export class SmsService {
  private client: twilio.Twilio;

  constructor() {
    this.client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN,
    );
  }

  async sendSMS(
    to: string,
    message: string,
  ): Promise<{ success: boolean; message?: string; error?: Error }> {
    try {
      const result = await this.client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to,
      });
      return { success: true, message: result.sid };
    } catch (error) {
      console.error('SMS sending error:', error);
      return { success: false, error: error as Error };
    }
  }

  async sendVerificationCode(
    phone: string,
    code: number,
  ): Promise<{ success: boolean; message?: string; error?: Error }> {
    const message = `Your verification code is: ${code}. Valid for 10 minutes.`;
    return await this.sendSMS(this.normalizePhone(phone), message);
  }

  normalizePhone = (phone: string) => {
    if (phone.startsWith('0')) {
      return '+84' + phone.slice(1);
    }
    return phone;
  };
}
