import { Module, forwardRef } from '@nestjs/common';
import { StaffController } from './staff.controller';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [forwardRef(() => ChatModule)],
  controllers: [StaffController],
})
export class StaffModule {}
