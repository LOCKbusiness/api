import { Module } from '@nestjs/common';
import { SharedModule } from 'src/shared/shared.module';
import { UserModule } from '../user/user.module';
import { VotingController } from './api/voting.controller';
import { VotingService } from './application/services/voting.service';

@Module({
  imports: [UserModule, SharedModule],
  providers: [VotingService],
  controllers: [VotingController],
  exports: [VotingService],
})
export class VotingModule {}
