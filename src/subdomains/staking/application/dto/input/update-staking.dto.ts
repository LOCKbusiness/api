import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';
import { Asset } from 'src/shared/models/asset/asset.entity';

export class UpdateStakingDto {
  @ApiProperty()
  @IsNotEmpty()
  asset: Asset;
}
