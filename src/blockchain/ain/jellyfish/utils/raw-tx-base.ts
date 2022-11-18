import { UtxoProviderService } from '../services/utxo-provider.service';

export class RawTxBase {
  constructor(
    protected readonly handle: <T>(call: () => Promise<T>) => Promise<T>,
    protected readonly utxoProvider: UtxoProviderService,
  ) {}
}
