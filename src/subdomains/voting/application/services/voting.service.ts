import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Config } from 'src/config/config';
import { MasternodeService } from 'src/integration/masternode/application/services/masternode.service';
import { Masternode } from 'src/integration/masternode/domain/entities/masternode.entity';
import { Asset, AssetType } from 'src/shared/models/asset/asset.entity';
import { HttpService } from 'src/shared/services/http.service';
import { Util } from 'src/shared/util';
import { StakingService } from 'src/subdomains/staking/application/services/staking.service';
import { StakingStrategy } from 'src/subdomains/staking/domain/enums';
import { UserService } from 'src/subdomains/user/application/services/user.service';
import { CfpResultDto } from '../dto/cfp-result.dto';
import { CfpSignMessageDto } from '../dto/cfp-sign-message.dto';
import { CfpDto, CfpInfo } from '../dto/cfp.dto';
import { Distribution } from '../dto/distribution.dto';
import { Vote, Votes } from '../dto/votes.dto';

@Injectable()
export class VotingService {
  private currentResult: CfpResultDto[] = [];

  constructor(
    private readonly userService: UserService,
    private readonly stakingService: StakingService,
    private readonly masternodeService: MasternodeService,
    private readonly http: HttpService,
  ) {}

  // --- CURRENT RESULT --- //
  async onModuleInit() {
    await this.updateResult();
  }

  @Cron(CronExpression.EVERY_HOUR)
  async updateResult(): Promise<void> {
    const { cfpList } = await this.getCfpInfos();
    const distribution = await this.getVoteDistribution(cfpList);

    this.currentResult = distribution.map((d) => ({
      number: d.cfpId,
      name: cfpList.find((c) => c.id === d.cfpId).name,
      result: d.distribution,
    }));
  }

  get result(): CfpResultDto[] {
    return this.currentResult;
  }

  // --- SIGN MESSAGES --- //
  async getSignMessages(): Promise<CfpSignMessageDto[]> {
    const { startDate, cfpList } = await this.getCfpInfos();
    const distribution = await this.getVoteDistribution(cfpList);
    const masternodes = await this.masternodeService.getAllVotersAt(startDate);

    // get masternode distribution
    const mnCount = masternodes.length;
    return distribution.map(({ cfpId, distribution: { yes, no } }) => {
      const { name } = cfpList.find((c) => c.id === cfpId);
      const mnCopy = [...masternodes];
      const yesMnCount = Math.round(yes * mnCount);
      const noMnCount = Math.round(no * mnCount);

      return {
        name,
        votes: [
          ...this.getSignInfos(mnCopy.splice(0, yesMnCount), name, Vote.YES),
          ...this.getSignInfos(mnCopy.splice(0, noMnCount), name, Vote.NO),
          ...this.getSignInfos(mnCopy, name, Vote.NEUTRAL),
        ],
      };
    });
  }

  private getSignInfos(
    masternodes: Masternode[],
    name: string,
    vote: Vote,
  ): { accountIndex: number; address: string; message: string }[] {
    return masternodes.map((mn) => ({
      accountIndex: mn.accountIndex,
      address: mn.owner,
      message: this.getSignText(name, vote),
    }));
  }

  // --- VOTING DISTRIBUTION --- //
  private async getVoteDistribution(cfpList: CfpInfo[]): Promise<{ cfpId: number; distribution: Distribution }[]> {
    // get the DFI distribution
    const userWithVotes = await this.userService.getAllUserWithVotes();
    const dfiDistribution: { [cfpId: string]: Distribution } = cfpList.reduce(
      (prev, curr) => ({ ...prev, [curr.id]: { yes: 0, no: 0, neutral: 0 } }),
      {},
    );

    for (const user of userWithVotes) {
      const votes: Votes = JSON.parse(user.votes);
      const stakingBalance = await this.getDfiStakingBalanceFor(user.id);

      for (const [cfpId, vote] of Object.entries(votes)) {
        if (dfiDistribution[+cfpId]) dfiDistribution[+cfpId][vote.toLowerCase()] += stakingBalance;
      }
    }

    // get vote percentage distribution
    return Object.entries(dfiDistribution).map(([cfpId, { yes, no, neutral }]) => {
      const total = Util.sum([yes, no, neutral]);
      return {
        cfpId: +cfpId,
        distribution: {
          yes: total ? Util.round(yes / total, 2) : 0,
          no: total ? Util.round(no / total, 2) : 0,
          neutral: total ? Util.round(neutral / total, 2) : 1,
        },
      };
    });
  }

  private async getDfiStakingBalanceFor(userId: number): Promise<number> {
    const stakings = await this.stakingService.getStakingsByUserId(userId, {
      asset: { name: 'DFI', type: AssetType.COIN } as Asset,
      strategy: StakingStrategy.MASTERNODE,
    });
    return stakings.reduce((a, s) => a + s.balance, 0);
  }

  // --- CFP HELPERS --- //
  private async getCfpInfos(): Promise<{ startDate: Date; cfpList: CfpInfo[] }> {
    const cfpList = await this.getCurrentCfpList();
    return {
      startDate: new Date(cfpList[0].startDate),
      cfpList: cfpList.map((cfp) => ({ id: cfp.number, name: cfp.title.split(':')[0] })),
    };
  }

  private async getCurrentCfpList(): Promise<CfpDto[]> {
    return this.http.get(`${Config.kyc.apiUrl}/statistic/cfp/latest`);
  }

  private getSignText(cfpName: string, vote: Vote): string {
    return `${cfpName}-${vote}`.toLowerCase();
  }
}
