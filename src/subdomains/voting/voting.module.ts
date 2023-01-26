import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IntegrationModule } from 'src/integration/integration.module';
import { SharedModule } from 'src/shared/shared.module';
import { StakingModule } from '../staking/staking.module';
import { UserModule } from '../user/user.module';
import { VotingController } from './api/voting.controller';
import { VoteRepository } from './application/repositories/voting.repository';
import { VotingService } from './application/services/voting.service';

@Module({
  imports: [TypeOrmModule.forFeature([VoteRepository]), UserModule, SharedModule, StakingModule, IntegrationModule],
  providers: [VotingService],
  controllers: [VotingController],
  exports: [VotingService],
})
export class VotingModule {}
