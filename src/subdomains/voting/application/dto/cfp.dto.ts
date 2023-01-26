import { ApiProperty } from '@nestjs/swagger';
import { VoteDecision } from '../../domain/enums';
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

export class CfpVoteDto extends CfpInfo {
  @ApiProperty({ enum: VoteDecision })
  vote: VoteDecision;
}

export class CfpVotesDto {
  @ApiProperty()
  depositAddress: string;

  @ApiProperty()
  balance: number;

  @ApiProperty({ type: CfpVoteDto, isArray: true })
  votes: CfpVoteDto[];
}

export class CfpResultDto extends CfpInfo {
  @ApiProperty({ type: Distribution })
  result: Distribution;
}
