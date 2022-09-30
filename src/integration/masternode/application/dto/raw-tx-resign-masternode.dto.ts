import { IsInt, IsNotEmpty, IsObject, IsString } from 'class-validator';
import { RawTxDto } from 'src/blockchain/ain/jellyfish/dto/raw-tx.dto';

export class RawTxResignMasternodeDto {
  @IsNotEmpty()
  @IsInt()
  id: number;

  @IsNotEmpty()
  @IsInt()
  accountIndex: number;

  @IsNotEmpty()
  @IsString()
  operator: string;

  @IsNotEmpty()
  @IsObject()
  rawTx: RawTxDto;
}
