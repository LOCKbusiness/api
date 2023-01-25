import { ApiProperty } from '@nestjs/swagger';
import { Distribution } from './distribution.dto';
import { Vote } from './votes.dto';

export interface CfpDto {
  id: string;
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

export class CfpUserVote extends CfpInfo {
  @ApiProperty({ enum: Vote })
  vote: Vote;
}

export class CfpVoteDto {
  @ApiProperty()
  depositAddress: string;

  @ApiProperty()
  balance: number;

  @ApiProperty({ type: CfpUserVote, isArray: true })
  votes: CfpUserVote[];
}

export class CfpResultDto extends CfpInfo {
  @ApiProperty({ type: Distribution })
  result: Distribution;
}
