import { SetMetadata } from '@nestjs/common';

export const EMAIL_VERIFIED_KEY = 'emailVerified';
export const EmailVerified = () => SetMetadata(EMAIL_VERIFIED_KEY, true);
