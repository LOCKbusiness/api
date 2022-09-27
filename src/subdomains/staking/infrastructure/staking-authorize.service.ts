import { Injectable, UnauthorizedException } from '@nestjs/common';
import { StakingRepository } from '../application/repositories/staking.repository';
import { Staking } from '../domain/entities/staking.entity';

@Injectable()
export class StakingAuthorizeService {
  constructor(private readonly repository: StakingRepository) {}

  async authorize(userId: number, stakingId: number): Promise<Staking> {
    const staking = await this.repository
      .createQueryBuilder('staking')
      .setLock('pessimistic_read')
      .where({ id: stakingId, userId })
      .getOne();

    if (!staking) throw new UnauthorizedException();

    return staking;
  }
}
