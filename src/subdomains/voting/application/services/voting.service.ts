import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Asset } from 'src/shared/models/asset/asset.entity';
import { StakingService } from 'src/subdomains/staking/application/services/staking.service';
import { StakingStrategy } from 'src/subdomains/staking/domain/enums';
import { UserService } from 'src/subdomains/user/application/services/user.service';
import { CfpDto } from '../dto/cfp.dto';

@Injectable()
export class VotingService {
  constructor(private userService: UserService, private stakingService: StakingService) {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  async getVotingResult(): Promise<CfpDto[]> {
    const userWithVotes = await this.userService.getAllUserWithVotes();
    const userVotes = [];
    for (const user of userWithVotes) {
      const userVotes = JSON.parse(user.votes);

      const stakings = await this.stakingService.getStakingsByUserId(user.id, {
        asset: { name: 'DFI' } as Asset,
        stakingStrategy: StakingStrategy.MASTERNODE,
      });
      const userAmount = stakings.reduce((a, s) => a + s.balance, 0);
      userVotes.push({ userVotes, userAmount });
    }

    //TODO convertion, calculation and mapping to masternodes

    return [] as CfpDto[];
  }
}
