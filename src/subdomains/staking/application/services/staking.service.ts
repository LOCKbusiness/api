import { Injectable } from '@nestjs/common';
import { UserService } from 'src/subdomains/user/application/services/user.service';
import { WalletBlockchainAddress } from 'src/subdomains/user/domain/entities/wallet-blockchain-address.entity';
import { StakingBlockchainAddress } from '../../domain/entities/staking-blockchain-address.entity';
import { Staking } from '../../domain/entities/staking.entity';
import { Authorize } from '../decorators/authorize.decorator';
import { CheckKyc } from '../decorators/check-kyc.decorator';
import { CreateStakingDto } from '../dto/input/create-staking.dto';
import { SetStakingFeeDto } from '../dto/input/set-staking-fee.dto';
import { StakingOutputDto } from '../dto/output/staking.output.dto';
import { StakingFactory } from '../factories/staking.factory';
import { StakingOutputDtoMapper } from '../mappers/staking-output-dto.mapper';
import { StakingRepository } from '../repositories/staking.repository';
import { StakingBlockchainAddressService } from './staking-blockchain-address.service';

@Injectable()
export class StakingService {
  constructor(
    public readonly repository: StakingRepository,
    public readonly userService: UserService,
    private readonly factory: StakingFactory,
    private readonly addressService: StakingBlockchainAddressService,
  ) {}

  //*** PUBLIC API ***//

  @CheckKyc
  async createStaking(userId: number, dto: CreateStakingDto): Promise<StakingOutputDto> {
    const staking = await this.createStakingDraft(userId, dto);

    const depositAddress = await this.addressService.getAvailableAddressForStaking(staking);
    const withdrawalAddress = await this.userService.getWalletAddress(userId);

    await this.finalizeStakingCreation(staking, depositAddress, withdrawalAddress);

    return StakingOutputDtoMapper.entityToDto(staking);
  }

  @Authorize
  @CheckKyc
  async getStaking(_userId: number, stakingId: string): Promise<StakingOutputDto> {
    const staking = await this.repository.findOne(stakingId);

    return StakingOutputDtoMapper.entityToDto(staking);
  }

  async setStakingFee(stakingId: string, dto: SetStakingFeeDto): Promise<void> {
    const { feePercent } = dto;
    const staking = await this.repository.findOne(stakingId);

    staking.setStakingFee(feePercent);

    await this.repository.save(staking);
  }

  //*** HELPER METHODS ***//

  private async createStakingDraft(userId: number, dto: CreateStakingDto): Promise<Staking> {
    const stakingDraft = await this.factory.createStaking(userId, dto);

    return this.repository.save(stakingDraft);
  }

  private async finalizeStakingCreation(
    staking: Staking,
    depositAddress: StakingBlockchainAddress,
    withdrawalAddress: WalletBlockchainAddress,
  ): Promise<void> {
    staking.finalizeCreation(depositAddress, withdrawalAddress);

    await this.repository.save(staking);
  }
}
