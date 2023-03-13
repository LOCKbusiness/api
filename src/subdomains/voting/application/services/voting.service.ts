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
import { CfpMnVoteDto } from '../dto/cfp-mn-vote.dto';
import { User } from 'src/subdomains/user/domain/entities/user.entity';
import { CfpInfoDto, CfpInfo, CfpResultDto, CfpVoteDto, CfpVotesDto } from '../dto/cfp.dto';
import { Distribution } from '../dto/distribution.dto';
import { VoteRepository } from '../repositories/voting.repository';
import { VoteDecision, VoteStatus } from '../../domain/enums';
import { RepositoryFactory } from 'src/shared/repositories/repository.factory';
import { Vote } from '../../domain/entities/vote.entity';
import { ProposalStatus } from '@defichain/jellyfish-api-core/dist/category/governance';
import { WhaleService } from 'src/blockchain/ain/whale/whale.service';
import { WhaleClient } from 'src/blockchain/ain/whale/whale-client';
import { StakingDeFiChainService } from 'src/subdomains/staking/infrastructure/staking-defichain.service';
import BigNumber from 'bignumber.js';

@Injectable()
export class VotingService implements OnModuleInit {
  private readonly VoteMap: { [k in VoteDecision]: MasternodeVote } = {
    [VoteDecision.NO]: MasternodeVote.NO,
    [VoteDecision.YES]: MasternodeVote.YES,
    [VoteDecision.NEUTRAL]: MasternodeVote.NEUTRAL,
  };

  private currentResults: CfpResultDto[] = [];
  private votingLock = new Lock(86400);
  private client: WhaleClient;

  constructor(
    private readonly repos: RepositoryFactory,
    private readonly voteRepo: VoteRepository,
    private readonly userService: UserService,
    private readonly masternodeService: MasternodeService,
    private readonly http: HttpService,
    private readonly transactionService: TransactionExecutionService,
    private readonly deFiChainService: StakingDeFiChainService,
    readonly whaleService: WhaleService,
  ) {
    whaleService.getClient().subscribe((client) => (this.client = client));
  }

  // --- CURRENT RESULT --- //
  onModuleInit() {
    void this.updateResult();
  }

  @Cron(CronExpression.EVERY_HOUR)
  async updateResult(): Promise<void> {
    if (Config.processDisabled(Process.ANALYTICS)) return;

    try {
      const cfpList = await this.getCfpList();
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
    const cfpList = await this.getCfpList();
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
    const cfpList = await this.getCfpList();
    return this.getMasternodeVotesFor(cfpList);
  }

  private async getMasternodeVotesFor(cfpList: CfpInfo[]): Promise<CfpMnVoteDto[]> {
    const distributions = await this.getVoteDistributions(cfpList);
    const masternodes = await this.masternodeService.getAllVoters();

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
            status: VoteStatus.CREATED,
          }),
        ),
      )
      .reduce((prev, curr) => prev.concat(curr), []);

    for (const entity of entities) {
      await this.voteRepo.save(entity);
    }
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async createNewVotes() {
    if (Config.processDisabled(Process.MASTERNODE)) return;

    try {
      const currentBlock = this.client.currentBlockHeight;
      const currentProposals = await this.getCfpList();
      const existingProposals = await this.voteRepo
        .createQueryBuilder('vote')
        .select(['proposalId'])
        .distinct(true)
        .getRawMany<{ proposalId: string }>();

      // get proposals to vote on
      const pendingProposals = currentProposals
        .filter((p) => currentBlock > p.endHeight - 2880)
        .filter((p1) => !existingProposals.some((p2) => p1.id === p2.proposalId));
      if (pendingProposals.length === 0) return;

      // create votes
      const pendingVotes = await this.getMasternodeVotesFor(pendingProposals);
      await this.createVotes(pendingVotes);
    } catch (e) {
      console.error(`Exception during vote creation:`, e);
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async processPendingVotes() {
    if (Config.processDisabled(Process.MASTERNODE)) return;
    if (!this.votingLock.acquire()) return;

    try {
      await this.sendFeeUtxos();
      await this.doVote();
    } catch (e) {
      console.error(`Exception during vote processing:`, e);
    } finally {
      this.votingLock.release();
    }
  }

  private async sendFeeUtxos() {
    const pendingVotes = await this.voteRepo.getByStatuses([VoteStatus.CREATED]);
    if (pendingVotes.length === 0) return;

    const txList = [];
    const groupedVotes = Util.groupBy(pendingVotes, 'proposalId');
    for (const votes of groupedVotes.values()) {
      const txIds = await Util.doInBatches(votes, (votes) => this.sendFeeUtxo(votes), 500);
      txList.push(...txIds.filter((id) => id));
    }

    if (txList.length > 0) await this.client.waitForTx(txList.pop());
  }

  private async sendFeeUtxo(votes: Vote[]): Promise<string | undefined> {
    try {
      const txId = await this.deFiChainService.sendFeeUtxos(
        votes.map((v) => v.masternode.owner),
        new BigNumber(Config.masternode.voteFee),
      );
      await this.voteRepo.update(
        votes.map((v) => v.id),
        { status: VoteStatus.FEE_SENT },
      );
      return txId;
    } catch (e) {
      console.error(`Failed to send fee UTXO for votes ${votes.map((v) => v.id).join(',')}:`, e);
    }
  }

  private async doVote() {
    const pendingVotes = await this.voteRepo.getByStatuses([VoteStatus.FEE_SENT]);
    await Util.doInBatches(pendingVotes, (votes) => Promise.all(votes.map((v) => this.processVote(v))), 100);
  }

  private async processVote(vote: Vote) {
    try {
      const txId = await this.transactionService.voteMasternode({
        ownerWallet: vote.masternode.ownerWallet,
        accountIndex: vote.masternode.accountIndex,
        masternode: vote.masternode,
        proposalId: vote.proposalId,
        voteDecision: this.VoteMap[vote.decision],
      });
      await this.voteRepo.update(vote.id, { txId, status: VoteStatus.COMPLETE });
    } catch (e) {
      console.error(`Failed to process vote ${vote.id}:`, e);
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
  private async getCfpList(): Promise<CfpInfo[]> {
    const cfpList = await this.getCurrentCfpList();
    return cfpList
      .filter((cfp) => cfp.status === ProposalStatus.VOTING)
      .map((cfp) => ({ id: cfp.number, name: cfp.title, endDate: new Date(cfp.endDate), endHeight: cfp.endHeight }));
  }

  private async getCurrentCfpList(): Promise<CfpInfoDto[]> {
    return this.http.get(`${Config.kyc.apiUrl}/statistic/cfp/latest`);
  }
}
