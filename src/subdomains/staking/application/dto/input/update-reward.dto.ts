import { IsEnum, IsNumber, IsOptional } from 'class-validator';
import { RewardStatus } from 'src/subdomains/staking/domain/enums';

export class UpdateRewardDto {
  @IsOptional()
  @IsEnum(RewardStatus)
  status?: RewardStatus;

  @IsOptional()
  @IsNumber()
  inputReferenceAmount?: number;

  @IsOptional()
  @IsNumber()
  outputReferenceAmount?: number;

  @IsOptional()
  @IsNumber()
  feePercent?: number;

  @IsOptional()
  @IsNumber()
  feeAmount?: number;
}
