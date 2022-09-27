import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { CryptoService } from 'src/blockchain/shared/services/crypto.service';
import { Staking } from '../../domain/entities/staking.entity';
import { Withdrawal } from '../../domain/entities/withdrawal.entity';
import { WithdrawalStatus } from '../../domain/enums';
import { StakingAuthorizeService } from '../../infrastructure/staking-authorize.service';
import { StakingDeFiChainService } from '../../infrastructure/staking-defichain.service';
import { StakingKycCheckService } from '../../infrastructure/staking-kyc-check.service';
import { SignWithdrawalDto } from '../dto/input/create-withdrawal.dto';
import { CreateWithdrawalDraftDto } from '../dto/input/create-withdrawal-draft.dto';
import { WithdrawalDraftOutputDto } from '../dto/output/withdrawal-draft.output.dto';
import { StakingOutputDto } from '../dto/output/staking.output.dto';
import { StakingFactory } from '../factories/staking.factory';
import { StakingOutputDtoMapper } from '../mappers/staking-output-dto.mapper';
import { StakingRepository } from '../repositories/staking.repository';
import { WithdrawalDraftOutputDtoMapper } from '../mappers/withdrawal-draft-output-dto.mapper';
import { WalletBlockchainAddress } from 'src/subdomains/user/domain/entities/wallet-blockchain-address.entity';

@Injectable()
export class StakingWithdrawalService {
  constructor(
    private readonly repository: StakingRepository,
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

    // save is required to get withdrawal id
    await this.repository.save(staking);

    withdrawal.setSignMessage();

    await this.repository.save(staking);

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

    this.verifySignature(dto.signature, withdrawal, staking.withdrawalAddress);

    staking.signWithdrawal(withdrawal.id, dto.signature);

    await this.repository.save(staking);

    return StakingOutputDtoMapper.entityToDto(staking);
  }

  async getStakingWithPendingWithdrawals(): Promise<Staking[]> {
    return await this.repository
      .createQueryBuilder('staking')
      .leftJoinAndSelect('staking.withdrawals', 'withdrawal')
      .where('withdrawal.status = :status', { status: WithdrawalStatus.PENDING })
      .getMany();
  }

  async designateWithdrawal(withdrawal: Withdrawal): Promise<void> {
    const txId = await this.deFiChainService.sendWithdrawal(withdrawal);

    withdrawal.designateWithdrawalPayout(txId);

    await this.repository.save(withdrawal.staking);
  }

  //*** JOBS ***//

  @Interval(60000)
  async checkWithdrawalCompletion(): Promise<void> {
    // not querying Stakings, because eager query is not supported, thus unsafe to fetch entire entity
    const stakingIdsWithPayingOutWithdrawals = await this.repository
      .createQueryBuilder('staking')
      .leftJoin('staking.withdrawals', 'withdrawals')
      .where('withdrawals.status = :status', { status: WithdrawalStatus.PAYING_OUT })
      .getMany()
      .then((s) => s.map((i) => i.id));

    for (const stakingId of stakingIdsWithPayingOutWithdrawals) {
      await this.checkPayingOutWithdrawals(stakingId);
    }
  }

  //*** HELPER METHOD ***//

  private verifySignature(signature: string, withdrawal: Withdrawal, withdrawalAddress: WalletBlockchainAddress): void {
    const isValid = this.cryptoService.verifySignature(withdrawal.signMessage, withdrawalAddress.address, signature);

    if (!isValid) throw new UnauthorizedException();
  }

  private async checkPayingOutWithdrawals(stakingId: number): Promise<void> {
    const staking = await this.repository.findOne(stakingId);
    const withdrawals = staking.getPayingOutWithdrawals();

    for (const withdrawal of withdrawals) {
      try {
        if (await this.isWithdrawalComplete(withdrawal)) {
          staking.confirmWithdrawal(withdrawal.id);
          await this.repository.save(staking);
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
