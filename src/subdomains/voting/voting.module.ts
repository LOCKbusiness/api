import { Module } from '@nestjs/common';
import { IntegrationModule } from 'src/integration/integration.module';
import { SharedModule } from 'src/shared/shared.module';
import { StakingModule } from '../staking/staking.module';
import { UserModule } from '../user/user.module';
import { VotingController } from './api/voting.controller';
import { VotingService } from './application/services/voting.service';

@Module({
  imports: [UserModule, SharedModule, StakingModule, IntegrationModule],
  providers: [VotingService],
  controllers: [VotingController],
  exports: [VotingService],
})
export class VotingModule {}
