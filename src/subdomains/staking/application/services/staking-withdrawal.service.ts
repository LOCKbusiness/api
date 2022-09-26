import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { CryptoService } from 'src/blockchain/shared/services/crypto.service';
import { Staking } from '../../domain/entities/staking.entity';
import { Withdrawal } from '../../domain/entities/withdrawal.entity';
import { WithdrawalStatus } from '../../domain/enums';
import { StakingAuthorizeService } from '../../infrastructure/staking-authorize.service';
import { StakingDeFiChainService } from '../../infrastructure/staking-defichain.service';
import { StakingKycCheckService } from '../../infrastructure/staking-kyc-check.service';
import { CreateWithdrawalDto } from '../dto/input/create-withdrawal.dto';
import { GetWithdrawalSignMessageDto } from '../dto/input/get-withdrawal-sign-message.dto';
import { SignWithdrawalOutputDto } from '../dto/output/sign-withdrawal.output.dto';
import { StakingOutputDto } from '../dto/output/staking.output.dto';
import { StakingFactory } from '../factories/staking.factory';
import { StakingOutputDtoMapper } from '../mappers/staking-output-dto.mapper';
import { StakingRepository } from '../repositories/staking.repository';

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

  async createWithdrawal(
    userId: number,
    walletId: number,
    stakingId: number,
    dto: CreateWithdrawalDto,
  ): Promise<StakingOutputDto> {
    await this.kycCheck.check(userId, walletId);

    const staking = await this.authorize.authorize(userId, stakingId);
    const withdrawal = this.factory.createWithdrawal(staking, dto);

    this.verifySignature(dto.signature, dto.amount, staking);

    staking.withdraw(withdrawal);

    await this.repository.save(staking);

    return StakingOutputDtoMapper.entityToDto(staking);
  }

  async getSignMessage(
    userId: number,
    walletId: number,
    stakingId: number,
    dto: GetWithdrawalSignMessageDto,
  ): Promise<SignWithdrawalOutputDto> {
    await this.kycCheck.check(userId, walletId);

    const staking = await this.authorize.authorize(userId, stakingId);

    const message = staking.generateWithdrawalSignatureMessage(
      dto.amount,
      staking.asset.name,
      staking.withdrawalAddress.address,
    );

    return { message };
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

  private verifySignature(signature: string, amount: number, staking: Staking): void {
    const message = staking.generateWithdrawalSignatureMessage(
      amount,
      staking.asset.name,
      staking.withdrawalAddress.address,
    );

    const isValid = this.cryptoService.verifySignature(message, staking.withdrawalAddress.address, signature);

    if (!isValid) throw new UnauthorizedException();
  }

  private async checkPayingOutWithdrawals(stakingId: number): Promise<void> {
    const staking = await this.repository.findOne(stakingId);
    const withdrawals = staking.getPayingOutWithdrawals();

    for (const withdrawal of withdrawals) {
      try {
        if (await this.isWithdrawalComplete(withdrawal)) {
          staking.confirmWithdrawal(withdrawal.id.toString());
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
