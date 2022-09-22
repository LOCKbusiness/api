import { Injectable } from '@nestjs/common';
import { BlockchainAddress } from 'src/shared/models/blockchain-address/blockchain-address.entity';
import { BlockchainAddressService } from 'src/shared/models/blockchain-address/blockchain-address.service';
import { UserService } from 'src/subdomains/user/application/services/user.service';
import { Staking } from '../../domain/entities/staking.entity';
import { Authorize } from '../decorators/authorize.decorator';
import { CheckKyc } from '../decorators/check-kyc.decorator';
import { CreateStakingDto } from '../dto/input/create-staking.dto';
import { SetStakingFeeDto } from '../dto/input/set-staking-fee.dto';
import { StakingOutputDto } from '../dto/output/staking.output.dto';
import { StakingFactory } from '../factories/staking.factory';
import { StakingOutputDtoMapper } from '../mappers/staking-output-dto.mapper';
import { StakingRepository } from '../repositories/staking.repository';

@Injectable()
export class StakingService {
  constructor(
    private readonly factory: StakingFactory,
    private readonly repository: StakingRepository,
    private readonly blockchainAddressService: BlockchainAddressService,
    private readonly userService: UserService,
  ) {}

  //*** PUBLIC API ***//

  @Authorize()
  @CheckKyc()
  async createStaking(userId: number, dto: CreateStakingDto): Promise<StakingOutputDto> {
    const staking = await this.createStakingDraft(dto);

    const depositAddress = await this.blockchainAddressService.getAvailableAddressForStaking(staking);
    const withdrawalAddress = await this.userService.getWalletAddress(userId);

    await this.finalizeStakingCreation(staking, depositAddress, withdrawalAddress);

    return StakingOutputDtoMapper.entityToDto(staking);
  }

  @Authorize()
  @CheckKyc()
  async getStaking(userId: number, stakingId: string): Promise<StakingOutputDto> {
    const staking = await this.repository.findOne(stakingId);

    return StakingOutputDtoMapper.entityToDto(staking);
  }

  async setStakingFee(userId: number, stakingId: string, dto: SetStakingFeeDto): Promise<void> {
    const { feePercent } = dto;
    const staking = await this.repository.findOne(stakingId);

    staking.setStakingFee(feePercent);

    await this.repository.save(staking);
  }

  //*** HELPER METHODS ***//

  private async createStakingDraft(dto: CreateStakingDto): Promise<Staking> {
    const stakingDraft = await this.factory.createStaking(dto);

    return this.repository.save(stakingDraft);
  }

  private async finalizeStakingCreation(
    staking: Staking,
    depositAddress: BlockchainAddress,
    withdrawalAddress: BlockchainAddress,
  ): Promise<void> {
    staking.finalizeCreation(depositAddress, withdrawalAddress);

    await this.repository.save(staking);
  }
}
