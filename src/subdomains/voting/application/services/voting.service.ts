import { Injectable, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Config, Process } from 'src/config/config';
import { MasternodeService } from 'src/integration/masternode/application/services/masternode.service';
import { Masternode } from 'src/integration/masternode/domain/entities/masternode.entity';
import { TransactionExecutionService } from 'src/integration/transaction/application/services/transaction-execution.service';
import { Lock } from 'src/shared/lock';
import { HttpService } from 'src/shared/services/http.service';
import { Util } from 'src/shared/util';
import { Staking } from 'src/subdomains/staking/domain/entities/staking.entity';
import { MasternodeVote, StakingStrategy } from 'src/subdomains/staking/domain/enums';
import { UserService } from 'src/subdomains/user/application/services/user.service';
import { IsNull } from 'typeorm';
import { CfpMnVoteDto } from '../dto/cfp-mn-vote.dto';
import { User } from 'src/subdomains/user/domain/entities/user.entity';
import { CfpDto, CfpInfo, CfpResultDto, CfpVoteDto, CfpVotesDto } from '../dto/cfp.dto';
import { Distribution } from '../dto/distribution.dto';
import { VoteRepository } from '../repositories/voting.repository';
import { VoteDecision } from '../../domain/enums';
import { RepositoryFactory } from 'src/shared/repositories/repository.factory';

@Injectable()
export class VotingService implements OnModuleInit {
  private currentResults: CfpResultDto[] = [];
  private votingLock = new Lock(86400);

  constructor(
    private readonly repos: RepositoryFactory,
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
        id: d.cfpId,
        name: cfpList.find((c) => c.id === d.cfpId).name,
        result: d.distribution,
      }));
    } catch (e) {
      console.error(`Exception during voting evaluation:`, e);
    }
  }

  async getCurrentVotes(): Promise<CfpVotesDto[]> {
    const { cfpList } = await this.getCfpInfos();
    const userWithVotes = await this.userService.getAllUserWithVotes();
    const stakings = await this.repos.staking.getByStrategy(StakingStrategy.MASTERNODE);

    const cfpVotesList: CfpVotesDto[] = [];

    for (const staking of stakings) {
      const user = userWithVotes.find((user) => user.id === staking.userId);

      cfpVotesList.push({
        depositAddress: staking.depositAddress.address,
        balance: staking.defaultBalance.balance,
        votes: user ? this.getUserVotes(user, cfpList) : [],
      });
    }

    return cfpVotesList;
  }

  get result(): CfpResultDto[] {
    return this.currentResults;
  }

  // --- MASTERNODE VOTES --- //
  async getMasternodeVotes(): Promise<CfpMnVoteDto[]> {
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
          ...this.getVotes(tmpMasternodes.splice(0, yesMnCount), VoteDecision.YES),
          ...this.getVotes(tmpMasternodes.splice(0, noMnCount), VoteDecision.NO),
          ...this.getVotes(tmpMasternodes, VoteDecision.NEUTRAL),
        ],
      };
    });
  }

  private getVotes(
    masternodes: Masternode[],
    vote: VoteDecision,
  ): { accountIndex: number; address: string; vote: VoteDecision }[] {
    return masternodes.map((mn) => ({
      accountIndex: mn.accountIndex,
      address: mn.owner,
      vote: vote,
    }));
  }

  async createVotes(votes: CfpMnVoteDto[]): Promise<void> {
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
      const voteMap: { [k in VoteDecision]: MasternodeVote } = {
        [VoteDecision.NO]: MasternodeVote.NO,
        [VoteDecision.YES]: MasternodeVote.YES,
        [VoteDecision.NEUTRAL]: MasternodeVote.NEUTRAL,
      };

      const pendingVotes = await this.voteRepo.findBy({ txId: IsNull() });
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
    const stakings = await this.repos.staking.getByStrategy(StakingStrategy.MASTERNODE);

    for (const user of userWithVotes) {
      const stakingBalance = this.getDfiStakingBalanceFor(user.id, stakings);

      for (const [cfpId, vote] of Object.entries(user.vote)) {
        if (dfiDistribution[cfpId]) dfiDistribution[cfpId][vote.toLowerCase()] += stakingBalance;
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
      stakings.filter((s) => s.userId === userId).map((s) => s.defaultBalance),
      'balance',
    );
  }

  private getUserVotes(user: User, cfpList: CfpInfo[]): CfpVoteDto[] {
    return cfpList
      .filter((cfp) => this.getUserVote(user, cfp.id))
      .map((cfp) => ({ id: cfp.id, vote: this.getUserVote(user, cfp.id), name: cfp.name }));
  }

  private getUserVote(user: User, cfpId: string): VoteDecision | undefined {
    return Object.entries(user.vote).find(([id, _]) => id === cfpId)?.[1];
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
