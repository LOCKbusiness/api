import { Lock } from 'src/shared/lock';
import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CryptoService } from 'src/blockchain/shared/services/crypto.service';
import { Withdrawal } from '../../domain/entities/withdrawal.entity';
import { WithdrawalStatus } from '../../domain/enums';
import { StakingAuthorizeService } from '../../infrastructure/staking-authorize.service';
import { StakingDeFiChainService } from '../../infrastructure/staking-defichain.service';
import { StakingKycCheckService } from '../../infrastructure/staking-kyc-check.service';
import { SignWithdrawalDto } from '../dto/input/sign-withdrawal.dto';
import { CreateWithdrawalDraftDto } from '../dto/input/create-withdrawal-draft.dto';
import { WithdrawalDraftOutputDto } from '../dto/output/withdrawal-draft.output.dto';
import { StakingOutputDto } from '../dto/output/staking.output.dto';
import { StakingFactory } from '../factories/staking.factory';
import { WithdrawalDraftOutputDtoMapper } from '../mappers/withdrawal-draft-output-dto.mapper';
import { WithdrawalRepository } from '../repositories/withdrawal.repository';
import { WithdrawalOutputDto } from '../dto/output/withdrawal.output.dto';
import { WithdrawalOutputDtoMapper } from '../mappers/withdrawal-output-dto.mapper';
import { Between } from 'typeorm';
import { TransactionDto } from 'src/subdomains/analytics/application/dto/output/transactions.dto';
import { Config, Process } from 'src/config/config';
import { BlockchainAddress } from 'src/shared/entities/blockchain-address';
import { StakingService } from './staking.service';
import { Asset } from 'src/shared/entities/asset.entity';

@Injectable()
export class StakingWithdrawalService {
  constructor(
    private readonly withdrawalRepo: WithdrawalRepository,
    private readonly authorize: StakingAuthorizeService,
    private readonly kycCheck: StakingKycCheckService,
    private readonly factory: StakingFactory,
    private readonly cryptoService: CryptoService,
    private readonly deFiChainService: StakingDeFiChainService,
    private readonly stakingService: StakingService,
  ) {}

  // --- PUBLIC API --- //

  async createWithdrawalDraft(
    userId: number,
    walletId: number,
    stakingId: number,
    { asset, amount }: CreateWithdrawalDraftDto,
  ): Promise<WithdrawalDraftOutputDto> {
    await this.kycCheck.check(userId, walletId);

    const staking = await this.authorize.authorize(userId, stakingId);

    const withdrawal = await this.factory.createWithdrawalDraft(staking, asset, amount);

    const pendingWithdrawalsAmount = await this.withdrawalRepo.getInProgressAmount(stakingId, withdrawal.asset.id);
    staking.checkWithdrawalDraftOrThrow(withdrawal, pendingWithdrawalsAmount);

    try {
      /**
       * @note
       * first save is required in order to get withdrawal id
       */
      const withdrawalWithId = await this.withdrawalRepo.save(withdrawal);

      withdrawalWithId.setSignMessage();

      await this.withdrawalRepo.save(withdrawalWithId);
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
    const withdrawal = await this.getByIdOrThrow(withdrawalId);

    try {
      this.verifySignature(dto.signature, withdrawal, withdrawal.staking.withdrawalAddress);
    } catch (e) {
      if (e instanceof UnauthorizedException) {
        withdrawal.failWithdrawal();
        await this.withdrawalRepo.save(withdrawal);
      }

      throw e;
    }

    const pendingWithdrawalsAmount = await this.withdrawalRepo.getInProgressAmount(stakingId, withdrawal.asset.id);
    staking.checkBalanceForWithdrawalOrThrow(withdrawal, pendingWithdrawalsAmount);
    withdrawal.signWithdrawal(dto.signature);

    await this.withdrawalRepo.save(withdrawal);

    return this.stakingService.getStakingDto(staking, withdrawal.asset);
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
    const withdrawal = await this.getByIdOrThrow(withdrawalId);

    withdrawal.changeAmount(dto.amount, staking);

    const pendingWithdrawalsAmount = await this.withdrawalRepo.getInProgressAmount(stakingId, withdrawal.asset.id);
    staking.checkBalanceForWithdrawalOrThrow(withdrawal, pendingWithdrawalsAmount);

    await this.withdrawalRepo.save(withdrawal);

    return WithdrawalDraftOutputDtoMapper.entityToDto(withdrawal);
  }

  async getWithdrawals(dateFrom: Date = new Date(0), dateTo: Date = new Date()): Promise<TransactionDto[]> {
    const withdrawals = await this.withdrawalRepo.find({
      where: {
        outputDate: Between(dateFrom, dateTo),
        status: WithdrawalStatus.CONFIRMED,
      },
      relations: ['staking', 'asset'],
      loadEagerRelations: false,
    });

    return withdrawals.map((v) => ({
      id: v.id,
      date: v.outputDate,
      amount: v.amount,
      asset: v.asset.displayName,
      stakingStrategy: v.staking.strategy,
    }));
  }

  async getByIdOrThrow(withdrawalId: number): Promise<Withdrawal> {
    const withdrawal = await this.withdrawalRepo.findOneBy({ id: withdrawalId });

    if (!withdrawal) throw new NotFoundException('Withdrawal not found');

    return withdrawal;
  }

  async getDraftWithdrawals(userId: number, walletId: number, stakingId: number): Promise<WithdrawalDraftOutputDto[]> {
    await this.kycCheck.check(userId, walletId);
    await this.authorize.authorize(userId, stakingId);

    const draftWithdrawals = await this.withdrawalRepo.getDrafts(stakingId);

    return draftWithdrawals.map((w) => WithdrawalDraftOutputDtoMapper.entityToDto(w));
  }

  async getPendingAmount(asset: Asset): Promise<number> {
    return this.withdrawalRepo.getPendingAmount(asset.id);
  }

  async getPendingWithdrawalDtos(): Promise<WithdrawalOutputDto[]> {
    return this.withdrawalRepo.getAllPending().then((ws) => ws.map(WithdrawalOutputDtoMapper.entityToDto));
  }

  // --- JOBS --- //

  @Cron(CronExpression.EVERY_MINUTE)
  @Lock(1800)
  async doWithdrawals() {
    if (Config.processDisabled(Process.STAKING_WITHDRAWAL)) return;

    const withdrawals = await this.withdrawalRepo.getAllPending();
    if (withdrawals.length <= 0) return;

    const possibleWithdrawals = await this.deFiChainService.getPossibleWithdrawals(withdrawals);
    if (possibleWithdrawals.length <= 0) return;

    await Promise.all(
      possibleWithdrawals.map((w) =>
        this.payoutWithdrawal(w.id).catch((e) => console.error(`Failed to payout withdrawal ${w.id}:`, e)),
      ),
    );
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async checkWithdrawalCompletion(): Promise<void> {
    if (Config.processDisabled(Process.STAKING_WITHDRAWAL)) return;

    try {
      const stakingIdsWithPayingOutWithdrawals = await this.withdrawalRepo.getStakingIdsForPayingOut();

      for (const stakingId of stakingIdsWithPayingOutWithdrawals) {
        await this.checkPayingOutWithdrawals(stakingId);
      }
    } catch (e) {
      console.error('Exception during withdrawal completion check:', e);
    }
  }

  // --- HELPER METHODS --- //

  private verifySignature(signature: string, withdrawal: Withdrawal, withdrawalAddress: BlockchainAddress): void {
    const isValid = this.cryptoService.verifySignature(withdrawal.signMessage, withdrawalAddress.address, signature);

    if (!isValid) throw new UnauthorizedException();
  }

  private async payoutWithdrawal(withdrawalId: number): Promise<void> {
    // payout
    let withdrawal = await this.withdrawalRepo.findOneBy({ id: withdrawalId });
    const txId = await this.deFiChainService.sendWithdrawal(withdrawal);

    // update
    withdrawal = await this.withdrawalRepo.findOneBy({ id: withdrawalId });
    withdrawal.payoutWithdrawal(txId);
    await this.withdrawalRepo.save(withdrawal);
  }

  private async checkPayingOutWithdrawals(stakingId: number): Promise<void> {
    const withdrawals = await this.withdrawalRepo.getPayingOut(stakingId);

    for (const withdrawal of withdrawals) {
      try {
        if (await this.isWithdrawalComplete(withdrawal)) {
          withdrawal.confirmWithdrawal();

          /**
           * @note
           * potential case of updateStakingBalance failure is tolerated
           */
          await this.withdrawalRepo.save(withdrawal);
          await this.stakingService.updateStakingBalance(stakingId, withdrawal.asset);
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
