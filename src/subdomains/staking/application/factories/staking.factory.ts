import { Staking } from '../../domain/entities/staking.entity';
import { StakingCreationDto } from '../dto/staking-creation.dto';

export class StakingFactory {
  create(dto: StakingCreationDto): Staking {
    return new Staking();
  }
}
