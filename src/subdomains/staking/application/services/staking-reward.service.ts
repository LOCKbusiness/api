import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateRewardDto } from '../dto/input/create-reward.dto';
import { StakingOutputDto } from '../dto/output/staking.output.dto';
import { StakingFactory } from '../factories/staking.factory';
import { StakingOutputDtoMapper } from '../mappers/staking-output-dto.mapper';
import { StakingRepository } from '../repositories/staking.repository';

@Injectable()
export class StakingRewardService {
  constructor(private readonly factory: StakingFactory, private readonly repository: StakingRepository) {}

  //*** PUBLIC API ***//

  async createReward(stakingId: number, dto: CreateRewardDto): Promise<StakingOutputDto> {
    const staking = await this.repository.findOne(stakingId, { relations: ['rewards'] });
    if (!staking) throw new NotFoundException('Staking not found');

    const entity = await this.repository
      .createQueryBuilder('staking')
      .leftJoin('staking.rewards', 'rewards')
      .where('staking.id = :id', { id: stakingId })
      .andWhere('rewards.reinvestTxId = :reinvestTxId', { reinvestTxId: dto.reinvestTxId })
      .getOne();
    if (entity)
      throw new ConflictException('There is already a staking reward for the specified staking route and txId');

    const reward = this.factory.createReward(staking, dto);

    staking.addReward(reward);

    await this.repository.save(staking);

    return StakingOutputDtoMapper.entityToDto(staking);
  }
}
