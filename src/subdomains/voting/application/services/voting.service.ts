import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Asset, AssetType } from 'src/shared/models/asset/asset.entity';
import { Util } from 'src/shared/util';
import { StakingService } from 'src/subdomains/staking/application/services/staking.service';
import { StakingStrategy } from 'src/subdomains/staking/domain/enums';
import { UserService } from 'src/subdomains/user/application/services/user.service';
import { CfpDto } from '../dto/cfp.dto';

interface Distribution {
  yes: number;
  no: number;
  neutral: number;
}

@Injectable()
export class VotingService {
  constructor(private userService: UserService, private stakingService: StakingService) {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  async getVotingSignMessages(): Promise<CfpDto[]> {
    const distribution = await this.getVoteDistribution();

    // get masternode distribution
    const masternodes = []; // TODO: get all votable masternodes
    const mnCount = masternodes.length;
    const mnDistribution = distribution.map(({ cfpId, distribution: { yes, no } }) => {
      const yesMns = Math.round(yes * mnCount);
      const noMns = Math.round(no * mnCount);
      const neutralMns = mnCount - yesMns - noMns;

      return {
        cfpId,
        mns: { yes: yesMns, no: noMns, neutral: neutralMns },
      };
    });

    // TODO: get the mapping from CFP ID to CFP name and sign message (from DFX?)
    // TODO: map to CfpDto (maybe directly in upper map?)

    return [] as CfpDto[];
  }

  private async getVoteDistribution(): Promise<{ cfpId: string; distribution: Distribution }[]> {
    // get the DFI distribution
    const userWithVotes = await this.userService.getAllUserWithVotes();
    const dfiDistribution: { [cfpId: string]: Distribution } = {};

    for (const user of userWithVotes) {
      const votes: { [cfpId: string]: 'Yes' | 'No' | 'Neutral' } = JSON.parse(user.votes);
      const stakingBalance = await this.getDfiStakingBalanceFor(user.id);

      for (const [cfpId, vote] of Object.entries(votes)) {
        dfiDistribution[cfpId] ??= { yes: 0, no: 0, neutral: 0 };
        dfiDistribution[cfpId][vote.toLowerCase()] += stakingBalance;
      }
    }

    // get vote percentage distribution
    return Object.entries(dfiDistribution).map(([cfpId, { yes, no, neutral }]) => {
      const total = Util.sum([yes, no, neutral]);
      return {
        cfpId,
        distribution: {
          yes: Util.round(yes / total, 2),
          no: Util.round(no / total, 2),
          neutral: Util.round(neutral / total, 2),
        },
      };
    });
  }

  private async getDfiStakingBalanceFor(userId: number): Promise<number> {
    const stakings = await this.stakingService.getStakingsByUserId(userId, {
      asset: { name: 'DFI', type: AssetType.COIN } as Asset,
      stakingStrategy: StakingStrategy.MASTERNODE,
    });
    return stakings.reduce((a, s) => a + s.balance, 0);
  }
}
