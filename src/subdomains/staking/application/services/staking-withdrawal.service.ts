import { Injectable, UnauthorizedException } from '@nestjs/common';
import { DeFiClient } from 'src/blockchain/ain/node/defi-client';
import { NodeService, NodeType } from 'src/blockchain/ain/node/node.service';
import { CryptoService } from 'src/blockchain/shared/services/crypto.service';
import { Config } from 'src/config/config';
import { UserService } from 'src/subdomains/user/application/services/user.service';
import { Staking } from '../../domain/entities/staking.entity';
import { Withdrawal } from '../../domain/entities/withdrawal.entity';
import { WithdrawalStatus } from '../../domain/enums';
import { StakingAuthorizeService } from '../../infrastructure/staking-authorize.service';
import { StakingKycCheckService } from '../../infrastructure/staking-kyc-check.service';
import { ConfirmWithdrawalDto } from '../dto/input/confirm-withdrawal.dto';
import { CreateWithdrawalDto } from '../dto/input/create-withdrawal.dto';
import { StakingOutputDto } from '../dto/output/staking.output.dto';
import { StakingFactory } from '../factories/staking.factory';
import { StakingOutputDtoMapper } from '../mappers/staking-output-dto.mapper';
import { StakingRepository } from '../repositories/staking.repository';

@Injectable()
export class StakingWithdrawalService {
  private client: DeFiClient;

  constructor(
    public readonly repository: StakingRepository,
    public readonly userService: UserService,
    private readonly authorize: StakingAuthorizeService,
    private readonly kycCheck: StakingKycCheckService,
    private readonly factory: StakingFactory,
    private readonly cryptoService: CryptoService,
    nodeService: NodeService,
  ) {
    nodeService.getConnectedNode(NodeType.LIQ).subscribe((c) => (this.client = c));
  }

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

  async getStakingWithPendingWithdrawals(): Promise<Staking[]> {
    return await this.repository
      .createQueryBuilder('staking')
      .leftJoinAndSelect('staking.withdrawals', 'withdrawal')
      .where('withdrawal.status = :status', { status: WithdrawalStatus.PENDING })
      .getMany();
  }

  async prepareWithdrawal(withdrawal: Withdrawal): Promise<void> {
    const tx = await this.client.sendUtxoToMany([
      {
        addressTo: Config.staking.payoutWalletAddress,
        amount: withdrawal.amount + this.client.utxoFee,
      },
    ]);

    await this.client.waitForTx(tx).catch((e) => console.error(`Wait for withdrawal prepare transaction failed: ${e}`));

    withdrawal.designateWithdrawalPayout(tx);

    this.repository.save(withdrawal.staking);
  }

  async confirmWithdrawal(stakingId: number, withdrawalId: string, dto: ConfirmWithdrawalDto): Promise<void> {
    const { outputDate, withdrawalTxId } = dto;
    const staking = await this.repository.findOne(stakingId);

    staking.confirmWithdrawal(withdrawalId, outputDate, withdrawalTxId);

    await this.repository.save(staking);
  }

  async failWithdrawal(stakingId: number, withdrawalId: string): Promise<void> {
    const staking = await this.repository.findOne(stakingId);

    staking.failWithdrawal(withdrawalId);

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
