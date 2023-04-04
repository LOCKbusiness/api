import { Injectable } from '@nestjs/common';
import { Prevout } from '@defichain/jellyfish-transaction-builder';
import { QueueHandler } from 'src/shared/queue-handler';
import { RawTxDto } from '../dto/raw-tx.dto';
import { RawTxAccount } from '../utils/raw-tx-account';
import { RawTxMasternode } from '../utils/raw-tx-masternode';
import { RawTxPool } from '../utils/raw-tx-pool';
import { RawTxUtil } from '../utils/raw-tx-util';
import { RawTxUtxo } from '../utils/raw-tx-utxo';
import { RawTxVault } from '../utils/raw-tx-vault';
import { UtxoProviderService } from './utxo-provider.service';

@Injectable()
export class RawTxService {
  private readonly queue: QueueHandler;

  public readonly Account: RawTxAccount;
  public readonly Masternode: RawTxMasternode;
  public readonly Pool: RawTxPool;
  public readonly Utxo: RawTxUtxo;
  public readonly Vault: RawTxVault;

  constructor(private readonly utxoProvider: UtxoProviderService) {
    this.queue = new QueueHandler(900000, 60000);

    this.Account = new RawTxAccount((c) => this.call(c), utxoProvider);
    this.Masternode = new RawTxMasternode((c) => this.call(c), utxoProvider);
    this.Pool = new RawTxPool((c) => this.call(c), utxoProvider);
    this.Utxo = new RawTxUtxo((c) => this.call(c), utxoProvider);
    this.Vault = new RawTxVault((c) => this.call(c), utxoProvider);
  }

  async unlockUtxosOf({ scriptHex, prevouts }: RawTxDto): Promise<void> {
    return this.call(() =>
      this.utxoProvider.unlockSpentBasedOn(RawTxUtil.parseAddressFromScriptHex(scriptHex), prevouts),
    );
  }

  // --- HELPER METHODS --- //

  private call<T>(call: () => Promise<T>): Promise<T> {
    return this.queue.handle(() => call());
  }
}
