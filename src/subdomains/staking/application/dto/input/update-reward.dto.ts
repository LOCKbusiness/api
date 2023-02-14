import { IsEnum, IsOptional } from 'class-validator';
import { RewardStatus } from 'src/subdomains/staking/domain/enums';

export class UpdateRewardDto {
  @IsOptional()
  @IsEnum(RewardStatus)
  status?: RewardStatus;
}
