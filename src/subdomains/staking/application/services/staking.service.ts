import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AssetService } from 'src/shared/models/asset/asset.service';
import { UserService } from 'src/subdomains/user/application/services/user.service';
import { StakingAuthorizeService } from '../../infrastructure/staking-authorize.service';
import { StakingKycCheckService } from '../../infrastructure/staking-kyc-check.service';
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
    private readonly repository: StakingRepository,
    private readonly userService: UserService,
    private readonly authorize: StakingAuthorizeService,
    private readonly kycCheck: StakingKycCheckService,
    private readonly factory: StakingFactory,
    private readonly addressService: StakingBlockchainAddressService,
    private readonly assetService: AssetService,
  ) {}

  //*** PUBLIC API ***//

  async createStaking(userId: number, walletId: number, dto: CreateStakingDto): Promise<StakingOutputDto> {
    await this.kycCheck.check(userId, walletId);

    const depositAddress = await this.addressService.getAvailableAddress();
    const withdrawalAddress = await this.userService.getWalletAddress(userId, walletId);

    // only one staking per address
    const existingStaking = await this.repository.findOne({ where: { withdrawalAddress } });
    if (existingStaking) throw new ConflictException();

    const staking = await this.factory.createStaking(userId, depositAddress, withdrawalAddress, dto);

    await this.repository.save(staking);

    return StakingOutputDtoMapper.entityToDto(staking);
  }

  async getStaking(userId: number, walletId: number, dto: CreateStakingDto): Promise<StakingOutputDto> {
    await this.kycCheck.check(userId, walletId);

    const { assetName, blockchain } = dto;

    const asset = await this.assetService.getAssetByQuery({ name: assetName, blockchain });
    const withdrawalAddress = await this.userService.getWalletAddress(userId, walletId);

    if (!asset || !withdrawalAddress) throw new NotFoundException();

    const _staking = await this.repository.findOne({ userId, asset, withdrawalAddress });

    if (!_staking) throw new NotFoundException();

    const staking = await this.authorize.authorize(userId, _staking.id);

    return StakingOutputDtoMapper.entityToDto(staking);
  }

  async setStakingFee(stakingId: number, dto: SetStakingFeeDto): Promise<void> {
    const { feePercent } = dto;
    const staking = await this.repository.findOne(stakingId);

    staking.setStakingFee(feePercent);

    await this.repository.save(staking);
  }
}
