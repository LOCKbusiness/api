import { RawTxDto } from 'src/blockchain/ain/jellyfish/dto/raw-tx.dto';

export class TransactionOutputDto {
  id: string;
  issuerSignature: string;
  verifierSignature?: string;
  rawTx: RawTxDto;
  payload?: any;
}
