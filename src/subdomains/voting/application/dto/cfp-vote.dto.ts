import { ApiProperty } from '@nestjs/swagger';
import { BlockchainAddress } from 'src/shared/models/blockchain-address';
import { Vote } from './votes.dto';

export class CfpUserVote {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

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
