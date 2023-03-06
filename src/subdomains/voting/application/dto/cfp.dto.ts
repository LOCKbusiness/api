import { ProposalStatus } from '@defichain/jellyfish-api-core/dist/category/governance';
import { ApiProperty } from '@nestjs/swagger';
import { VoteDecision } from '../../domain/enums';
import { Distribution } from './distribution.dto';

export interface CfpInfoDto {
  number: string;
  title: string;
  type: 'cfp' | 'dfip';
  endDate: string;
  endHeight: number;
  status: ProposalStatus;
}

export class CfpInfo {
  id: string;
  name: string;
  endDate: Date;
  endHeight: number;
}

class CfpDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;
}

export class CfpVoteDto extends CfpDto {
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

export class CfpResultDto extends CfpDto {
  @ApiProperty({ type: Distribution })
  result: Distribution;
}
