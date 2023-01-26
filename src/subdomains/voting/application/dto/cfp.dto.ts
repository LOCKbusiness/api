import { ApiProperty } from '@nestjs/swagger';
import { Vote } from '../../domain/enums';
import { Distribution } from './distribution.dto';

export interface CfpDto {
  number: string;
  title: string;
  type: 'cfp' | 'dfip';
  startDate: string;
  endDate: string;
}

export class CfpInfo {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;
}

export class CfpVote extends CfpInfo {
  @ApiProperty({ enum: Vote })
  vote: Vote;
}

export class CfpVotesDto {
  @ApiProperty()
  depositAddress: string;

  @ApiProperty()
  balance: number;

  @ApiProperty({ type: CfpVote, isArray: true })
  votes: CfpVote[];
}

export class CfpResultDto extends CfpInfo {
  @ApiProperty({ type: Distribution })
  result: Distribution;
}
