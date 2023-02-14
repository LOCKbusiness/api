import { IsNotEmpty, IsNumber } from 'class-validator';

export class UpdateStakingAnalyticsDto {
  @IsNotEmpty()
  @IsNumber()
  apr?: number;
}
