import { Lock } from 'src/shared/lock';
import { BadRequestException, Injectable, NotImplementedException, UnauthorizedException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CryptoService } from 'src/blockchain/shared/services/crypto.service';
import { Withdrawal } from '../../domain/entities/withdrawal.entity';
import { StakingStrategy, WithdrawalStatus } from '../../domain/enums';
import { StakingAuthorizeService } from '../../infrastructure/staking-authorize.service';
import { StakingDeFiChainService } from '../../infrastructure/staking-defichain.service';
import { StakingKycCheckService } from '../../infrastructure/staking-kyc-check.service';
import { SignWithdrawalDto } from '../dto/input/sign-withdrawal.dto';
import { CreateWithdrawalDraftDto } from '../dto/input/create-withdrawal-draft.dto';
import { WithdrawalDraftOutputDto } from '../dto/output/withdrawal-draft.output.dto';
import { StakingOutputDto } from '../dto/output/staking.output.dto';
import { StakingFactory } from '../factories/staking.factory';
import { StakingOutputDtoMapper } from '../mappers/staking-output-dto.mapper';
import { StakingRepository } from '../repositories/staking.repository';
import { WithdrawalDraftOutputDtoMapper } from '../mappers/withdrawal-draft-output-dto.mapper';
import { WalletBlockchainAddress } from 'src/subdomains/user/domain/entities/wallet-blockchain-address.entity';
import { WithdrawalRepository } from '../repositories/withdrawal.repository';
import { WithdrawalOutputDto } from '../dto/output/withdrawal.output.dto';
import { WithdrawalOutputDtoMapper } from '../mappers/withdrawal-output-dto.mapper';
import { Between } from 'typeorm';
import { TransactionDto } from 'src/subdomains/analytics/application/dto/output/transactions.dto';
import { Config, Process } from 'src/config/config';

@Injectable()
export class StakingWithdrawalService {
  private readonly lock = new Lock(1800);

  constructor(
    private readonly stakingRepo: StakingRepository,
    private readonly withdrawalRepo: WithdrawalRepository,
    private readonly authorize: StakingAuthorizeService,
    private readonly kycCheck: StakingKycCheckService,
    private readonly factory: StakingFactory,
    private readonly cryptoService: CryptoService,
    private readonly deFiChainService: StakingDeFiChainService,
  ) {}

  // --- PUBLIC API --- //

  async getWithdrawals(dateFrom: Date = new Date(0), dateTo: Date = new Date()): Promise<TransactionDto[]> {
    const withdrawals = await this.withdrawalRepo.find({
      relations: ['asset'],
      where: { outputDate: Between(dateFrom, dateTo), status: WithdrawalStatus.CONFIRMED },
    });

    return withdrawals.map((v) => ({
      id: v.id,
      date: v.outputDate,
      amount: v.amount,
      asset: v.asset.displayName,
    }));
  }

  async createWithdrawalDraft(
    userId: number,
    walletId: number,
    stakingId: number,
    dto: CreateWithdrawalDraftDto,
  ): Promise<WithdrawalDraftOutputDto> {
    await this.kycCheck.check(userId, walletId);

    const staking = await this.authorize.authorize(userId, stakingId);

    const withdrawal = this.factory.createWithdrawalDraft(staking, dto);

    staking.addWithdrawalDraft(withdrawal);

    try {
      // save is required to get withdrawal id
      await this.stakingRepo.save(staking);

      withdrawal.setSignMessage();

      await this.stakingRepo.save(staking);
    } catch (e) {
      if (e.message.includes('Cannot insert duplicate key row')) {
        throw new BadRequestException('Existing withdrawal have to be finished first');
      }

      throw e;
    }

    return WithdrawalDraftOutputDtoMapper.entityToDto(withdrawal);
  }

  async signWithdrawal(
    userId: number,
    walletId: number,
    stakingId: number,
    withdrawalId: number,
    dto: SignWithdrawalDto,
  ): Promise<StakingOutputDto> {
    await this.kycCheck.check(userId, walletId);

    const staking = await this.authorize.authorize(userId, stakingId);
    const withdrawal = staking.getWithdrawal(withdrawalId);

    try {
      this.verifySignature(dto.signature, withdrawal, staking.withdrawalAddress);
    } catch (e) {
      if (e instanceof UnauthorizedException) {
        withdrawal.failWithdrawal();
        await this.stakingRepo.save(staking);
      }

      throw e;
    }

    staking.signWithdrawal(withdrawal.id, dto.signature);

    await this.stakingRepo.save(staking);

    return StakingOutputDtoMapper.entityToDto(staking);
  }

  async changeAmount(
    userId: number,
    walletId: number,
    stakingId: number,
    withdrawalId: number,
    dto: CreateWithdrawalDraftDto,
  ): Promise<WithdrawalDraftOutputDto> {
    await this.kycCheck.check(userId, walletId);

    const staking = await this.authorize.authorize(userId, stakingId);

    staking.changeWithdrawalAmount(withdrawalId, dto.amount);

    await this.stakingRepo.save(staking);

    const withdrawal = staking.getWithdrawal(withdrawalId);

    return WithdrawalDraftOutputDtoMapper.entityToDto(withdrawal);
  }

  async getDraftWithdrawals(userId: number, walletId: number, stakingId: number): Promise<WithdrawalDraftOutputDto[]> {
    await this.kycCheck.check(userId, walletId);

    const staking = await this.authorize.authorize(userId, stakingId);

    const draftWithdrawals = staking.getDraftWithdrawals();

    return draftWithdrawals.map((w) => WithdrawalDraftOutputDtoMapper.entityToDto(w));
  }

  async getPendingWithdrawals(): Promise<Withdrawal[]> {
    return this.withdrawalRepo.getPending();
  }

  async getPendingWithdrawalDtos(): Promise<WithdrawalOutputDto[]> {
    return this.withdrawalRepo.getPending().then((ws) => ws.map(WithdrawalOutputDtoMapper.entityToDto));
  }

  // --- JOBS --- //

  @Cron(CronExpression.EVERY_MINUTE)
  async doWithdrawals() {
    if (Config.processDisabled(Process.STAKING_WITHDRAWAL)) return;
    if (!this.lock.acquire()) return;

    try {
      const withdrawals = await this.getPendingWithdrawals();

      const possibleWithdrawals = await this.deFiChainService.getPossibleWithdrawals(withdrawals);
      if (possibleWithdrawals.length <= 0) return;

      await Promise.all(
        possibleWithdrawals.map((w) =>
          this.payoutWithdrawal(w.id).catch((e) => console.error(`Failed to payout withdrawal ${w.id}:`, e)),
        ),
      );
    } catch (e) {
      console.error('Exception during withdrawals cronjob:', e);
    }

    this.lock.release();
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async checkWithdrawalCompletion(): Promise<void> {
    if (Config.processDisabled(Process.STAKING_WITHDRAWAL)) return;

    try {
      // not querying Stakings, because eager query is not supported, thus unsafe to fetch entire entity
      const stakingIdsWithPayingOutWithdrawals = await this.stakingRepo
        .createQueryBuilder('staking')
        .leftJoin('staking.withdrawals', 'withdrawals')
        .where('withdrawals.status = :status', { status: WithdrawalStatus.PAYING_OUT })
        .getMany()
        .then((s) => s.map((i) => i.id));

      for (const stakingId of stakingIdsWithPayingOutWithdrawals) {
        await this.checkPayingOutWithdrawals(stakingId);
      }
    } catch (e) {
      console.error('Exception during withdrawal completion check:', e);
    }
  }

  // --- HELPER METHODS --- //

  private verifySignature(signature: string, withdrawal: Withdrawal, withdrawalAddress: WalletBlockchainAddress): void {
    const isValid = this.cryptoService.verifySignature(withdrawal.signMessage, withdrawalAddress.address, signature);

    if (!isValid) throw new UnauthorizedException();
  }

  private async payoutWithdrawal(withdrawalId: number): Promise<void> {
    // payout
    let withdrawal = await this.withdrawalRepo.findOne(withdrawalId, { relations: ['staking'] });
    const txId = await this.deFiChainService.sendWithdrawal(withdrawal);

    // update
    withdrawal = await this.withdrawalRepo.findOne(withdrawalId);
    withdrawal.payoutWithdrawal(txId);
    await this.withdrawalRepo.save(withdrawal);
  }

  private async checkPayingOutWithdrawals(stakingId: number): Promise<void> {
    const staking = await this.stakingRepo.findOne(stakingId);
    const withdrawals = staking.getPayingOutWithdrawals();

    for (const withdrawal of withdrawals) {
      try {
        if (await this.isWithdrawalComplete(withdrawal)) {
          staking.confirmWithdrawal(withdrawal.id);
          await this.stakingRepo.save(staking);
        }
      } catch (e) {
        console.error(`Error trying to confirm withdrawal. ID: ${withdrawal.id}`, e);
        continue;
      }
    }
  }

  private async isWithdrawalComplete(withdrawal: Withdrawal): Promise<boolean> {
    return this.deFiChainService.isWithdrawalTxComplete(withdrawal.withdrawalTxId);
  }
}
