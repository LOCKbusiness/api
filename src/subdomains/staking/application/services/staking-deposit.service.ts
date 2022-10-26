import { Injectable } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { Lock } from 'src/shared/lock';
import { PayInService } from 'src/subdomains/payin/application/services/payin.service';
import { PayIn, PayInPurpose } from 'src/subdomains/payin/domain/entities/payin.entity';
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
  private readonly recordLock = new Lock(7200);
  private readonly forwardLock = new Lock(7200);

  constructor(
    private readonly repository: StakingRepository,
    private readonly authorize: StakingAuthorizeService,
    private readonly kycCheck: StakingKycCheckService,
    private readonly factory: StakingFactory,
    private readonly deFiChainStakingService: StakingDeFiChainService,
    private readonly payInService: PayInService,
  ) {}

  //*** PUBLIC API ***//

  async createDeposit(
    userId: number,
    walletId: number,
    stakingId: number,
    dto: CreateDepositDto,
  ): Promise<StakingOutputDto> {
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
    if (!this.recordLock.acquire()) return;

    try {
      await this.recordDepositTransactions();
    } catch (e) {
      console.error('Exception during staking deposit checks:', e);
    } finally {
      this.recordLock.release();
    }
  }

  @Interval(60000)
  async checkBlockchainNeedForwardInputs(): Promise<void> {
    if (!this.forwardLock.acquire()) return;

    try {
      await this.forwardDepositsToStaking();
    } catch (e) {
      console.error('Exception during staking forwarding:', e);
    } finally {
      this.forwardLock.release();
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
      .where('staking.status != :status', { status: StakingStatus.BLOCKED })
      .getRawMany<{ address: string }>()
      .then((a) => a.map((a) => a.address));

    return allPayIns.filter((p) => stakingAddresses.includes(p.address.address));
  }

  private async getStakingsForPayIns(stakingPayIns: PayIn[]): Promise<[number, PayIn][]> {
    const stakingPairs: [number, PayIn][] = [];

    for (const payIn of stakingPayIns) {
      const staking = await this.repository.findOne({
        depositAddress: { address: payIn.address.address, blockchain: payIn.address.blockchain },
      });

      stakingPairs.push([staking.id, payIn]);
    }

    return stakingPairs;
  }

  private async processNewDeposits(stakingPairs: [number, PayIn][]): Promise<void> {
    for (const [stakingId, payIn] of stakingPairs) {
      try {
        const staking = await this.repository.findOne({ where: { id: stakingId } });
        const payInValid = staking.getConfirmedDeposits().length > 0 || (await this.isFirstPayInValid(staking, payIn));

        if (payInValid) {
          this.createOrUpdateDeposit(staking, payIn);
        } else {
          console.error(`Invalid first pay in, staking ${staking.id} is blocked`);
          staking.block();
        }

        await this.repository.save(staking);
        await this.payInService.acknowledgePayIn(payIn, PayInPurpose.CRYPTO_STAKING);
      } catch (e) {
        const message = `Failed to process deposit input: ${payIn.id}. Error:`;
        console.error(message, e);
      }
    }
  }

  private async isFirstPayInValid(staking: Staking, payIn: PayIn): Promise<boolean> {
    const addresses = await this.deFiChainStakingService.getSourceAddresses(payIn.txId);
    return staking.verifyUserAddresses(addresses);
  }

  private createOrUpdateDeposit(staking: Staking, payIn: PayIn): void {
    const deposit = staking.getDepositByPayInTxId(payIn.txId) ?? this.createNewDeposit(staking, payIn);

    deposit.updatePreCreatedDeposit(payIn.txId, payIn.amount);
  }

  private createNewDeposit(staking: Staking, payIn: PayIn): Deposit {
    const newDeposit = this.factory.createDeposit(staking, { amount: payIn.amount, txId: payIn.txId });

    staking.addDeposit(newDeposit);

    return newDeposit;
  }

  private async forwardDepositsToStaking(): Promise<void> {
    await this.deFiChainStakingService.checkSync();

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
