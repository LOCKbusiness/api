import { Injectable } from '@nestjs/common';
import { UserService } from 'src/subdomains/user/application/services/user.service';
import { KYCStatus } from 'src/subdomains/user/domain/enums';
import { Staking } from '../../domain/entities/staking.entity';
import { StakingCreationDto } from '../dto/staking-creation.dto';
import { StakingFactory } from '../factories/staking.factory';
import { StakingRepository } from '../repositories/staking.repository';

@Injectable()
export class StakingService {
  constructor(
    private readonly factory: StakingFactory,
    private readonly repository: StakingRepository,
    private readonly userService: UserService,
  ) {}

  async createStaking(dto: StakingCreationDto, userId: number): Promise<Staking> {
    const userKycStatus = await this.userService.getKYCStatus(userId);

    if (userKycStatus !== KYCStatus.SUCCESS) throw new Error('Cannot proceed without KYC');

    const staking = this.factory.create(dto);

    await this.repository.save(staking);

    return staking;
  }
}
