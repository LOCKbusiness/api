import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { Lock } from 'src/shared/lock';
import { PayInService } from 'src/subdomains/payin/application/services/payin.service';
import { PayIn, PayInPurpose } from 'src/subdomains/payin/domain/entities/payin.entity';
import { UserService } from 'src/subdomains/user/application/services/user.service';
import { Deposit } from '../../domain/entities/deposit.entity';
import { StakingBlockchainAddress } from '../../domain/entities/staking-blockchain-address.entity';
import { Staking } from '../../domain/entities/staking.entity';
import { DepositStatus, StakingStatus } from '../../domain/enums';
import { StakingAuthorizeService } from '../../infrastructure/staking-authorize.service';
import { StakingDeFiChainService } from '../../infrastructure/staking-defichain.service';
import { StakingKycCheckService } from '../../infrastructure/staking-kyc-check.service';
import { CreateDepositDto } from '../dto/input/create-deposit.dto';
import { StakingOutputDto } from '../dto/output/staking.output.dto';
import { StakingFactory } from '../factories/staking.factory';
import { StakingOutputDtoMapper } from '../mappers/staking-output-dto.mapper';
import { StakingRepository } from '../repositories/staking.repository';

@Injectable()
export class StakingDepositService {
  private readonly lock = new Lock(7200);

  constructor(
    public readonly repository: StakingRepository,
    public readonly userService: UserService,
    private readonly authorize: StakingAuthorizeService,
    private readonly kycCheck: StakingKycCheckService,
    private readonly factory: StakingFactory,
    private readonly deFiChainStakingService: StakingDeFiChainService,
    private readonly payInService: PayInService,
  ) {}

  //*** PUBLIC API ***//

  async createDeposit(userId: number, walletId: number, stakingId: number, dto: CreateDepositDto): Promise<StakingOutputDto> {
    await this.kycCheck.check(userId, walletId);

    const staking = await this.authorize.authorize(userId, stakingId);

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
      console.error('Exception during staking deposit checks:', e);
    } finally {
      this.lock.release();
    }
  }

  //*** HELPER METHODS ***//

  private async recordDepositTransactions(): Promise<void> {
    const newPayInTransactions = await this.payInService.getNewPayInTransactions();

    if (!newPayInTransactions) return;

    const stakingPayIns = await this.filterStakingPayIns(newPayInTransactions);
    const stakingPairs = await this.getStakingsForPayIns(stakingPayIns);

    await this.processNewDeposits(stakingPairs);
  }

  private async filterStakingPayIns(allPayIns: PayIn[]): Promise<PayIn[]> {
    const stakingAddresses = await this.repository
      .createQueryBuilder('staking')
      .leftJoin('staking.depositAddress', 'depositAddress')
      .select('depositAddress.address', 'address')
      .where('staking.status = :status', { status: StakingStatus.ACTIVE })
      .getRawMany<{ address: string }>()
      .then((a) => a.map((a) => a.address));

    return allPayIns.filter((p) => stakingAddresses.includes(p.address.address));
  }

  private async getStakingsForPayIns(stakingPayIns: PayIn[]): Promise<[Staking, PayIn][]> {
    const stakingPairs = [];

    for (const payIn of stakingPayIns) {
      const staking = await this.repository.findOne({ withdrawalAddress: payIn.address });

      stakingPairs.push([payIn, staking]);
    }

    return stakingPairs;
  }

  private async processNewDeposits(stakingPairs: [Staking, PayIn][]): Promise<void> {
    for (const [staking, payIn] of stakingPairs) {
      try {
        const payInValid = staking.getConfirmedDeposits().length > 0 || (await this.isFirstPayInValid(staking, payIn));

        if (payInValid) {
          this.createOrUpdateDeposit(staking, payIn);
        } else {
          console.error(`Invalid first pay in, staking ${staking.id} is blocked`);
          staking.block();
        }

        await this.repository.save(staking);
        await this.payInService.acknowledgePayIn(payIn, PayInPurpose.CRYPTO_STAKING);
      } catch (e) {}
    }
  }

  private async isFirstPayInValid(staking: Staking, payIn: PayIn): Promise<boolean> {
    const addresses = await this.deFiChainStakingService.getSourceAddresses(payIn.txId);
    return staking.verifyUserAddresses(addresses);
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
    // not querying Stakings, because eager query is not supported, thus unsafe to fetch entire entity
    const stakingIdsWithPendingDeposits = await this.repository
      .createQueryBuilder('staking')
      .leftJoin('staking.deposits', 'deposits')
      .where('deposits.status = :status', { status: DepositStatus.PENDING })
      .getMany()
      .then((s) => s.map((i) => i.id));

    for (const stakingId of stakingIdsWithPendingDeposits) {
      await this.processPendingDepositsForStaking(stakingId);
    }
  }

  private async processPendingDepositsForStaking(stakingId: number): Promise<void> {
    const staking = await this.repository.findOne(stakingId);
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
