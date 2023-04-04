import { ProposalStatus } from '@defichain/jellyfish-api-core/dist/category/governance';
import { ApiProperty } from '@nestjs/swagger';
import { VoteDecision } from '../../domain/enums';
import { Distribution } from './distribution.dto';

export enum CfpType {
  CFP = 'cfp',
  DFIP = 'dfip',
}

class ServiceVotesDto {
  total: number;
  yes: number;
  neutral: number;
  no: number;
}

class CfpDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;
}

export class CfpInfoInputDto {
  number: string;
  title: string;
  type: CfpType;
  lockVotes?: ServiceVotesDto;
  endDate: string;
  endHeight: number;
  status: ProposalStatus;
}

export class CfpInfoOutputDto {
  id: string;
  title: string;
  type: CfpType;
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
