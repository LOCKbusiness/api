import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
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
import { StakingOutputDtoMapper } from '../mappers/staking-output-dto.mapper';
import { StakingRepository } from '../repositories/staking.repository';
import { WithdrawalDraftOutputDtoMapper } from '../mappers/withdrawal-draft-output-dto.mapper';
import { WalletBlockchainAddress } from 'src/subdomains/user/domain/entities/wallet-blockchain-address.entity';
import { WithdrawalRepository } from '../repositories/withdrawal.repository';
import { WithdrawalOutputDto } from '../dto/output/withdrawal.output.dto';
import { WithdrawalOutputDtoMapper } from '../mappers/withdrawal-output-dto.mapper';

@Injectable()
export class StakingWithdrawalService {
  constructor(
    private readonly stakingRepo: StakingRepository,
    private readonly withdrawalRepo: WithdrawalRepository,
    private readonly authorize: StakingAuthorizeService,
    private readonly kycCheck: StakingKycCheckService,
    private readonly factory: StakingFactory,
    private readonly cryptoService: CryptoService,
    private readonly deFiChainService: StakingDeFiChainService,
  ) {}

  //*** PUBLIC API ***//

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

  async executeWithdrawal(withdrawalId: number): Promise<void> {
    // payout
    let withdrawal = await this.withdrawalRepo.findOne(withdrawalId, { relations: ['staking'] });
    const txId = await this.deFiChainService.sendWithdrawal(withdrawal);

    // update
    withdrawal = await this.withdrawalRepo.findOne(withdrawalId);
    withdrawal.payoutWithdrawal(txId);
    await this.withdrawalRepo.save(withdrawal);
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

  //*** JOBS ***//

  @Interval(60000)
  async checkWithdrawalCompletion(): Promise<void> {
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

  //*** HELPER METHOD ***//

  private verifySignature(signature: string, withdrawal: Withdrawal, withdrawalAddress: WalletBlockchainAddress): void {
    const isValid = this.cryptoService.verifySignature(withdrawal.signMessage, withdrawalAddress.address, signature);

    if (!isValid) throw new UnauthorizedException();
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
