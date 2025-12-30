import { SetMetadata } from '@nestjs/common';

export const PHONE_VERIFIED_KEY = 'phoneVerifiedOnly';
export const RequiresPhoneVerified = () =>
  SetMetadata(PHONE_VERIFIED_KEY, true);
