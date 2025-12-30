import { SetMetadata } from '@nestjs/common';

export const SKIP_SHIPPER_GUARD = 'skipShipperGuard';
export const SkipShipperGuard = () => SetMetadata(SKIP_SHIPPER_GUARD, true);