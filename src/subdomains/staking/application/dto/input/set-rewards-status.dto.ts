import { IsArray, IsEnum, IsNotEmpty } from 'class-validator';
import { RewardStatus } from 'src/subdomains/staking/domain/enums';

export class SetRewardsStatusDto {
  @IsNotEmpty()
  @IsEnum(RewardStatus)
  status: RewardStatus;

  @IsNotEmpty()
  @IsArray()
  ids: number[];
}
