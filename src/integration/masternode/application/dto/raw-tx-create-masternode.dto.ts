import { IsInt, IsNotEmpty, IsObject } from 'class-validator';
import { RawTxDto } from 'src/blockchain/ain/jellyfish/dto/raw-tx.dto';

export class RawTxCreateMasternodeDto {
  @IsNotEmpty()
  @IsInt()
  id: number;

  @IsNotEmpty()
  @IsInt()
  accountIndex: number;

  @IsNotEmpty()
  @IsObject()
  rawTx: RawTxDto;
}
