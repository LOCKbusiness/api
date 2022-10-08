import { RawTxDto } from 'src/blockchain/ain/jellyfish/dto/raw-tx.dto';

export class TransactionDto {
  id: string;
  issuerSignature: string;
  verifierSignature?: string;
  rawTx: RawTxDto;
  payload?: any;
}
