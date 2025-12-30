import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { VerificationService } from './verification.service';
import { Verification, VerificationSchema } from './schema/verification.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Verification.name, schema: VerificationSchema },
    ]),
  ],
  providers: [VerificationService],
  exports: [VerificationService, MongooseModule],
})
export class VerificationModule {}
