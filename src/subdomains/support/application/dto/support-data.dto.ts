import { IsEnum, IsNotEmpty } from 'class-validator';
import { Deposit } from 'src/subdomains/staking/domain/entities/deposit.entity';
import { Reward } from 'src/subdomains/staking/domain/entities/reward.entity';
import { Withdrawal } from 'src/subdomains/staking/domain/entities/withdrawal.entity';
import { User } from 'src/subdomains/user/domain/entities/user.entity';
import { SupportTable } from '../services/support.service';

export class SupportReturnData {
  user: User;
  deposits: Deposit[];
  withdrawals: Withdrawal[];
  rewards: Reward[];
}

export class SupportDataQuery {
  @IsNotEmpty()
  @IsEnum(SupportTable)
  table: SupportTable;

  @IsNotEmpty()
  key: string;

  @IsNotEmpty()
  value: any;
}
