import { Injectable, UnauthorizedException } from '@nestjs/common';
import { CryptoService } from 'src/blockchain/shared/services/crypto.service';
import { Staking } from '../../domain/entities/staking.entity';
import { StakingDeFiChainService } from '../../infrastructre/staking-defichain.service';
import { Authorize } from '../decorators/authorize.decorator';
import { CheckKyc } from '../decorators/check-kyc.decorator';
import { ConfirmWithdrawalDto } from '../dto/input/confirm-withdrawal.dto';
import { CreateWithdrawalDto } from '../dto/input/create-withdrawal.dto';
import { DesignateWithdrawalDto } from '../dto/input/designate-withdrawal.dto';
import { StakingOutputDto } from '../dto/output/staking.output.dto';
import { StakingFactory } from '../factories/staking.factory';
import { StakingOutputDtoMapper } from '../mappers/staking-output-dto.mapper';
import { StakingRepository } from '../repositories/staking.repository';

@Injectable()
export class StakingWithdrawalService {
  constructor(
    private readonly factory: StakingFactory,
    private readonly repository: StakingRepository,
    private readonly cryptoService: CryptoService,
    private readonly deFiChainStakingService: StakingDeFiChainService,
  ) {}

  //*** PUBLIC API ***//

  @Authorize()
  @CheckKyc()
  async createWithdrawal(userId: number, stakingId: string, dto: CreateWithdrawalDto): Promise<StakingOutputDto> {
    const staking = await this.repository.findOne(stakingId);
    const withdrawal = this.factory.createWithdrawal(staking, dto);

    this.verifySignature(dto.signature, dto.amount, staking);

    staking.withdraw(withdrawal);

    await this.repository.save(staking);

    return StakingOutputDtoMapper.entityToDto(staking);
  }

  async designateWithdrawalPayout(stakingId: string, withdrawalId: string, dto: DesignateWithdrawalDto): Promise<void> {
    const { prepareTxId } = dto;
    const staking = await this.repository.findOne(stakingId);

    const withdrawal = staking.getWithdrawal(withdrawalId);
    withdrawal.designateWithdrawalPayout(prepareTxId);

    await this.repository.save(staking);
  }

  async confirmWithdrawal(stakingId: string, withdrawalId: string, dto: ConfirmWithdrawalDto): Promise<void> {
    const { outputDate, withdrawalTxId } = dto;
    const staking = await this.repository.findOne(stakingId);

    staking.confirmWithdrawal(withdrawalId, outputDate, withdrawalTxId);

    await this.repository.save(staking);
  }

  async failWithdrawal(stakingId: string, withdrawalId: string): Promise<void> {
    const staking = await this.repository.findOne(stakingId);

    const withdrawal = staking.getWithdrawal(withdrawalId);
    withdrawal.failWithdrawal();

    await this.repository.save(staking);
  }

  //*** HELPER METHOD ***//

  verifySignature(signature: string, amount: number, staking: Staking): void {
    const message = staking.generateWithdrawalSignatureMessage(
      amount,
      staking.asset.name,
      staking.withdrawalAddress.address,
    );

    const isValid = this.cryptoService.verifySignature(message, staking.withdrawalAddress.address, signature);

    if (!isValid) throw new UnauthorizedException();
  }
}
