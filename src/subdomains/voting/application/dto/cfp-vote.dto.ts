import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsInt, IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { Vote } from '../../domain/enums';

export class CfpVoteDto {
  @IsNotEmpty()
  @IsString()
  id: string;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VoteDto)
  votes: VoteDto[];
}

export class VoteDto {
  @IsNotEmpty()
  @IsInt()
  accountIndex: number;

  @IsNotEmpty()
  @IsString()
  address: string;

  @IsNotEmpty()
  @IsEnum(Vote)
  vote: Vote;
}
