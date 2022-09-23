import { Injectable, UnauthorizedException } from '@nestjs/common';
import { StakingRepository } from '../application/repositories/staking.repository';

@Injectable()
export class StakingAuthorizeService {
  constructor(private readonly repository: StakingRepository) {}

  async authorize(userId: number): Promise<void> {
    const staking = await this.repository.findOne({ userId });

    if (!staking) throw new UnauthorizedException();
  }
}
