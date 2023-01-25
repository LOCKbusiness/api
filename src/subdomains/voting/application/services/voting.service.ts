import { Injectable, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Config, Process } from 'src/config/config';
import { MasternodeService } from 'src/integration/masternode/application/services/masternode.service';
import { Masternode } from 'src/integration/masternode/domain/entities/masternode.entity';
import { TransactionExecutionService } from 'src/integration/transaction/application/services/transaction-execution.service';
import { Lock } from 'src/shared/lock';
import { AssetType } from 'src/shared/models/asset/asset.entity';
import { HttpService } from 'src/shared/services/http.service';
import { Util } from 'src/shared/util';
import { StakingRepository } from 'src/subdomains/staking/application/repositories/staking.repository';
import { Staking } from 'src/subdomains/staking/domain/entities/staking.entity';
import { MasternodeVote, StakingStrategy } from 'src/subdomains/staking/domain/enums';
import { UserService } from 'src/subdomains/user/application/services/user.service';
import { getCustomRepository, IsNull } from 'typeorm';
import { Vote } from '../../domain/enums';
import { CfpResultDto } from '../dto/cfp-result.dto';
import { CfpVoteDto } from '../dto/cfp-vote.dto';
import { CfpDto, CfpInfo } from '../dto/cfp.dto';
import { Distribution } from '../dto/distribution.dto';
import { VoteRepository } from '../repositories/voting.repository';

@Injectable()
export class VotingService implements OnModuleInit {
  private currentResults: CfpResultDto[] = [];
  private votingLock = new Lock(86400);

  constructor(
    private readonly voteRepo: VoteRepository,
    private readonly userService: UserService,
    private readonly masternodeService: MasternodeService,
    private readonly http: HttpService,
    private readonly transactionService: TransactionExecutionService,
  ) {}

  // --- CURRENT RESULT --- //
  onModuleInit() {
    void this.updateResult();
  }

  @Cron(CronExpression.EVERY_HOUR)
  async updateResult(): Promise<void> {
    if (Config.processDisabled(Process.ANALYTICS)) return;

    try {
      const { cfpList } = await this.getCfpInfos();
      const distributions = await this.getVoteDistributions(cfpList);

      this.currentResults = distributions.map((d) => ({
        number: d.cfpId,
        name: cfpList.find((c) => c.id === d.cfpId).name,
        result: d.distribution,
      }));
    } catch (e) {
      console.error(`Exception during voting evaluation:`, e);
    }
  }

  get result(): CfpResultDto[] {
    return this.currentResults;
  }

  // --- MASTERNODE VOTES --- //
  async getMasternodeVotes(): Promise<CfpVoteDto[]> {
    const { startDate, cfpList } = await this.getCfpInfos();
    const distributions = await this.getVoteDistributions(cfpList);
    const masternodes = await this.masternodeService.getAllVotersAt(startDate);

    // get masternode distribution and signing messages
    const mnCount = masternodes.length;
    return distributions.map(({ cfpId, distribution: { yes, no } }) => {
      const { id, name } = cfpList.find((c) => c.id === cfpId);
      const tmpMasternodes = [...masternodes];
      const yesMnCount = Math.round(yes * mnCount);
      const noMnCount = Math.round(no * mnCount);

      return {
        id,
        name,
        votes: [
          ...this.getVotes(tmpMasternodes.splice(0, yesMnCount), Vote.YES),
          ...this.getVotes(tmpMasternodes.splice(0, noMnCount), Vote.NO),
          ...this.getVotes(tmpMasternodes, Vote.NEUTRAL),
        ],
      };
    });
  }

  private getVotes(masternodes: Masternode[], vote: Vote): { accountIndex: number; address: string; vote: Vote }[] {
    return masternodes.map((mn) => ({
      accountIndex: mn.accountIndex,
      address: mn.owner,
      vote: vote,
    }));
  }

  async createVotes(votes: CfpVoteDto[]): Promise<void> {
    const masternodes = await this.masternodeService.getAll();

    const entities = votes
      .map((cfp) =>
        cfp.votes.map((v) =>
          this.voteRepo.create({
            masternode: masternodes.find((mn) => mn.owner === v.address),
            proposalId: cfp.id,
            proposalName: cfp.name,
            decision: v.vote,
          }),
        ),
      )
      .reduce((prev, curr) => prev.concat(curr), []);

    for (const entity of entities) {
      await this.voteRepo.save(entity);
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async processPendingVotes() {
    if (Config.processDisabled(Process.MASTERNODE)) return;
    if (!this.votingLock.acquire()) return;

    try {
      const voteMap: { [k in Vote]: MasternodeVote } = {
        [Vote.NO]: MasternodeVote.NO,
        [Vote.YES]: MasternodeVote.YES,
        [Vote.NEUTRAL]: MasternodeVote.NEUTRAL,
      };

      const pendingVotes = await this.voteRepo.find({ txId: IsNull() });
      for (const vote of pendingVotes) {
        const txId = await this.transactionService.voteMasternode({
          ownerWallet: vote.masternode.ownerWallet,
          accountIndex: vote.masternode.accountIndex,
          masternode: vote.masternode,
          proposalId: vote.proposalId,
          voteDecision: voteMap[vote.decision],
        });
        await this.voteRepo.update(vote.id, { txId });
      }
    } catch (e) {
      console.error(`Exception during vote processing:`, e);
    } finally {
      this.votingLock.release();
    }
  }

  // --- VOTING DISTRIBUTION --- //
  private async getVoteDistributions(cfpList: CfpInfo[]): Promise<{ cfpId: string; distribution: Distribution }[]> {
    // get the DFI distribution
    const userWithVotes = await this.userService.getAllUserWithVotes();
    const dfiDistribution: { [cfpId: string]: Distribution } = cfpList.reduce(
      (prev, curr) => ({ ...prev, [curr.id]: { yes: 0, no: 0, neutral: 0 } }),
      {},
    );
    const stakings = await getCustomRepository(StakingRepository).getByType({
      asset: { name: 'DFI', type: AssetType.COIN },
      strategy: StakingStrategy.MASTERNODE,
    });

    for (const user of userWithVotes) {
      const stakingBalance = this.getDfiStakingBalanceFor(user.id, stakings);

      for (const [cfpId, vote] of Object.entries(user.vote)) {
        if (dfiDistribution[+cfpId]) dfiDistribution[+cfpId][vote.toLowerCase()] += stakingBalance;
      }
    }

    // get vote percentage distribution
    return Object.entries(dfiDistribution).map(([cfpId, { yes, no, neutral }]) => {
      const total = Util.sum([yes, no, neutral]);
      return {
        cfpId: cfpId,
        distribution: {
          yes: total ? Util.round(yes / total, 2) : 0,
          no: total ? Util.round(no / total, 2) : 0,
          neutral: total ? Util.round(neutral / total, 2) : 1,
        },
      };
    });
  }

  private getDfiStakingBalanceFor(userId: number, stakings: Staking[]): number {
    return Util.sumObj(
      stakings.filter((s) => s.userId === userId),
      'balance',
    );
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
}
