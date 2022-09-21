import { Injectable } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { Lock } from 'src/shared/lock';
import { BlockchainAddress } from 'src/shared/models/blockchain-address/blockchain-address.entity';
import { PayInService } from 'src/subdomains/payin/application/services/payin.service';
import { PayIn, PayInPurpose } from 'src/subdomains/payin/domain/entities/payin-crypto.entity';
import { Staking } from '../../domain/entities/staking.entity';
import { StakingDeFiChainService } from '../../infrastructre/staking-defichain.service';
import { Authorize } from '../decorators/authorize.decorator';
import { CheckKyc } from '../decorators/check-kyc.decorator';
import { CreateDepositDto } from '../dto/input/create-deposit.dto';
import { StakingOutputDto } from '../dto/output/staking.output.dto';
import { StakingFactory } from '../factories/staking.factory';
import { StakingOutputDtoMapper } from '../mappers/staking-output-dto.mapper';
import { StakingRepository } from '../repositories/staking.repository';

@Injectable()
export class StakingDepositService {
  private readonly lock = new Lock(7200);

  constructor(
    private readonly factory: StakingFactory,
    private readonly repository: StakingRepository,
    private readonly deFiChainStakingService: StakingDeFiChainService,
    private readonly payInService: PayInService,
  ) {}

  //*** PUBLIC API ***//

  @Authorize()
  @CheckKyc()
  async createDeposit(userId: number, stakingId: string, dto: CreateDepositDto): Promise<StakingOutputDto> {
    // TODO - make sure to overwrite the amount with actual amount from BC transaction
    const staking = await this.repository.findOne(stakingId);

    const deposit = this.factory.createDeposit(staking, dto);

    staking.addDeposit(deposit);

    await this.repository.save(staking);

    return StakingOutputDtoMapper.entityToDto(staking);
  }

  //*** JOBS ***//

  @Interval(60000)
  async checkBlockchainDepositInputs(): Promise<void> {
    if (!this.lock.acquire()) return;

    try {
      await this.recordDepositTransactions();
      await this.forwardDepositsToStaking();
    } catch (e) {
      console.error('Exception during DeFiChain input checks:', e);
    } finally {
      this.lock.release();
    }
  }

  //*** HELPER METHODS ***//

  private async recordDepositTransactions(): Promise<void> {
    const newPayInTransactions = await this.payInService.getNewPayInTransactions();
    const stakingPayIns = await this.filterStakingPayIns(newPayInTransactions);
    const stakingPairs = await this.getStakingsForPayIns(stakingPayIns);

    await this.processNewDeposits(stakingPairs);
  }

  private async filterStakingPayIns(allPayIns: PayIn[]): Promise<PayIn[]> {
    // TODO - Temp - this query is wrong, lookup for proper query
    const stakingAddresses = (await this.repository
      .createQueryBuilder('staking')
      .leftJoin('staking.withdrawalAddress', 'withdrawalAddress')
      .select('withdrawalAddress')
      .where('staking.status = Active')
      .getMany()) as unknown as string[];

    return allPayIns.filter((p) => stakingAddresses.includes(p.txSource.address));
  }

  private async getStakingsForPayIns(stakingPayIns: PayIn[]): Promise<[Staking, PayIn][]> {
    const stakingPairs = [];

    for (const payIn of stakingPayIns) {
      const staking = await this.repository.findOne({ withdrawalAddress: payIn.txSource });

      stakingPairs.push([payIn, staking]);
    }

    return stakingPairs;
  }

  private async processNewDeposits(stakingPairs: [Staking, PayIn][]): Promise<void> {
    for (const [staking, payIn] of stakingPairs) {
      try {
        if (staking.deposits.length === 0) this.verifyFirstPayIn(staking, payIn);

        const deposit = this.factory.createDeposit(staking, { amount: payIn.amount, txId: payIn.txId });

        staking.addDeposit(deposit);

        await this.repository.save(staking);
        await this.payInService.acknowledgePayIn(payIn, PayInPurpose.CRYPTO_STAKING);
      } catch (e) {}
    }
  }

  private async verifyFirstPayIn(staking: Staking, payIn: PayIn): Promise<void> {
    // verify addresses
  }

  private async forwardDepositsToStaking(): Promise<void> {
    // find all stakings where one of deposits cas status PENDING_FORWARD
    // get those deposits -> run the forwarding
    // change deposits state, set status to confirmed
    // save the stakings
  }

  private async confirmDeposit(userId: number, stakingId: string, depositId: string, txId: string): Promise<Staking> {
    const staking = await this.repository.findOne(stakingId);

    const deposit = staking.getDeposit(depositId);

    deposit.confirmDeposit(txId);

    await this.repository.save(staking);

    return staking;
  }
}
