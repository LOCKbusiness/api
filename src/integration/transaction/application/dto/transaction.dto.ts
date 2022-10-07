import { IsNotEmpty, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';
import { RawTxDto } from 'src/blockchain/ain/jellyfish/dto/raw-tx.dto';

export class TransactionDto {
  @IsNotEmpty()
  @IsUUID()
  id: string;

  @IsNotEmpty()
  @IsString()
  issuerSignature: string;

  @IsOptional()
  @IsString()
  verifierSignature?: string;

  @IsNotEmpty()
  @IsObject()
  rawTx: RawTxDto;

  @IsOptional()
  payload?: any;
}
