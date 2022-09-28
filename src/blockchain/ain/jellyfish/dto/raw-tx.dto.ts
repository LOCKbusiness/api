import { Prevout } from '@defichain/jellyfish-transaction-builder';
import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class RawTxDto {
  @IsNotEmpty()
  @IsString()
  hex: string;

  @IsNotEmpty()
  @IsString()
  scriptHex: string;

  @IsNotEmpty()
  @IsArray()
  prevouts: Prevout[];
}
