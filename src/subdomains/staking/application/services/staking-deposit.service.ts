import { Injectable } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { Lock } from 'src/shared/lock';
import { PayInService } from 'src/subdomains/payin/application/services/payin.service';
import { PayIn, PayInPurpose } from 'src/subdomains/payin/domain/entities/payin.entity';
import { Deposit } from '../../domain/entities/deposit.entity';
import { StakingBlockchainAddress } from '../../domain/entities/staking-blockchain-address.entity';
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
    // TODO - to add relations
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

    return allPayIns.filter((p) => stakingAddresses.includes(p.address.address));
  }

  private async getStakingsForPayIns(stakingPayIns: PayIn[]): Promise<[Staking, PayIn][]> {
    const stakingPairs = [];

    for (const payIn of stakingPayIns) {
      // TODO - add relations
      const staking = await this.repository.findOne({ withdrawalAddress: payIn.address });

      stakingPairs.push([payIn, staking]);
    }

    return stakingPairs;
  }

  private async processNewDeposits(stakingPairs: [Staking, PayIn][]): Promise<void> {
    for (const [staking, payIn] of stakingPairs) {
      try {
        // this will not work, filter non-pending additionally
        if (staking.deposits.length === 0) this.verifyFirstPayIn(staking, payIn);

        this.createOrUpdateDeposit(staking, payIn);

        await this.repository.save(staking);
        await this.payInService.acknowledgePayIn(payIn, PayInPurpose.CRYPTO_STAKING);
      } catch (e) {}
    }
  }

  private async verifyFirstPayIn(staking: Staking, payIn: PayIn): Promise<void> {
    // get real source address
    // verify addresses
    // this.userService.verifyUserAddress(sourceAddress);
    // throw Unauth if not
  }

  private createOrUpdateDeposit(staking: Staking, payIn: PayIn): void {
    const existingDeposit = staking.getDepositByPayInTxId(payIn.txId);

    if (existingDeposit) {
      existingDeposit.updatePreCreatedDeposit(payIn.txId, payIn.amount);
    } else {
      this.createNewDeposit(staking, payIn);
    }
  }

  private createNewDeposit(staking: Staking, payIn: PayIn): void {
    const newDeposit = this.factory.createDeposit(staking, { amount: payIn.amount, txId: payIn.txId });

    staking.addDeposit(newDeposit);
  }

  private async forwardDepositsToStaking(): Promise<void> {
    // TODO - create query to find all stakings with pending deposites
    const stakingsWithPendingDeposits = await this.repository.find({});

    for (const staking of stakingsWithPendingDeposits) {
      await this.processPendingDepositsForStaking(staking);
    }
  }

  private async processPendingDepositsForStaking(staking: Staking): Promise<void> {
    const deposits = staking.getPendingDeposits();

    for (const deposit of deposits) {
      const txId = await this.forwardDepositToStaking(deposit, staking.depositAddress);
      staking.confirmDeposit(deposit.id.toString(), txId);

      await this.repository.save(staking);
    }
  }

  private async forwardDepositToStaking(deposit: Deposit, depositAddress: StakingBlockchainAddress): Promise<string> {
    return this.deFiChainStakingService.forwardDeposit(depositAddress.address, deposit.amount);
  }
}
