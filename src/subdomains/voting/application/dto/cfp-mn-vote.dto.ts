import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsInt, IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { VoteDecision } from '../../domain/enums';

export class CfpMnVoteDto {
  @IsNotEmpty()
  @IsString()
  id: string;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MnVoteDto)
  votes: MnVoteDto[];
}

export class MnVoteDto {
  @IsNotEmpty()
  @IsInt()
  accountIndex: number;

  @IsNotEmpty()
  @IsString()
  address: string;

  @IsNotEmpty()
  @IsEnum(VoteDecision)
  vote: VoteDecision;
}
