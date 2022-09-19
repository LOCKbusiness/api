import { Deposit } from '../../domain/entities/deposit.entity';
import { Staking } from '../../domain/entities/staking.entity';
import { CreateDepositDto } from '../dto/create-deposit.dto';
import { CreateStakingDto } from '../dto/create-staking.dto';

export class StakingFactory {
  createStaking(dto: CreateStakingDto): Staking {
    return new Staking();
  }

  createDeposit(dto: CreateDepositDto): Deposit {
    return new Deposit();
  }
}
