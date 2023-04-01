import { ProposalStatus } from '@defichain/jellyfish-api-core/dist/category/governance';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VoteDecision } from '../../domain/enums';
import { Distribution } from './distribution.dto';

export enum cfpType {
  CFP = 'cfp',
  DFIP = 'dfip',
}

class ServiceVotesDto {
  @ApiProperty()
  total: number;

  @ApiProperty()
  yes: number;

  @ApiProperty()
  neutral: number;

  @ApiProperty()
  no: number;
}

class CfpDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;
}

export class CfpInfoInputDto {
  @ApiProperty()
  number: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ enum: cfpType })
  type: cfpType;

  @ApiPropertyOptional({ type: ServiceVotesDto })
  lockVotes?: ServiceVotesDto;

  @ApiProperty()
  endDate: string;

  @ApiProperty()
  endHeight: number;

  @ApiProperty({ enum: ProposalStatus })
  status: ProposalStatus;
}

export class CfpInfoOutputDto {
  number: string;
  title: string;
  type: cfpType;
  hasLockVoted: boolean;
}

export class CfpInfo {
  id: string;
  name: string;
  endDate: Date;
  endHeight: number;
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

export class CfpAllData {
  voterCount: number;
  cfpInfos: CfpInfoOutputDto[];
  voteResult: CfpVotesDto[];
}
