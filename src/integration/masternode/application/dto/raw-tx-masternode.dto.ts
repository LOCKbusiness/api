import { IsInt, IsNotEmpty, IsObject, IsString } from 'class-validator';
import { RawTxDto } from 'src/blockchain/ain/jellyfish/dto/raw-tx.dto';

export class RawTxMasternodeDto {
  @IsNotEmpty()
  @IsInt()
  id: number;

  @IsNotEmpty()
  @IsInt()
  accountIndex: number;

  @IsNotEmpty()
  @IsString()
  owner: string;

  @IsNotEmpty()
  @IsString()
  operator: string;

  @IsNotEmpty()
  @IsObject()
  rawTx: RawTxDto;

  @IsNotEmpty()
  @IsString()
  apiSignature: string;
}
