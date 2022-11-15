import { MainNet, Network, TestNet } from '@defichain/jellyfish-network';
import { CTransactionSegWit, Vout, toOPCodes } from '@defichain/jellyfish-transaction';
import { Prevout } from '@defichain/jellyfish-transaction-builder';
import { JellyfishWallet, WalletAccount, WalletHdNode } from '@defichain/jellyfish-wallet';
import { Bip32Options, MnemonicHdNodeProvider } from '@defichain/jellyfish-wallet-mnemonic';
import { WhaleWalletAccount, WhaleWalletAccountProvider } from '@defichain/whale-api-wallet';
import { Injectable } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import BigNumber from 'bignumber.js';
import { Config } from 'src/config/config';
import { QueueHandler } from 'src/shared/queue-handler';
import { RawTxDto } from '../dto/raw-tx.dto';
import { RawTxUtil } from '../utils/raw-tx-util';
import { UtxoProviderService } from './utxo-provider.service';
import { SmartBuffer } from 'smart-buffer';
import { RawTxMasternode } from '../utils/raw-tx-masternode';
import { RawTxVault } from '../utils/raw-tx-vault';
import { RawTxUtxo } from '../utils/raw-tx-utxo';
import { RawTxAccount } from '../utils/raw-tx-account';
import { RawTxPool } from '../utils/raw-tx-pool';

@Injectable()
export class JellyfishService {
  private readonly queue: QueueHandler;

  public Account: RawTxAccount;
  public Masternode: RawTxMasternode;
  public Pool: RawTxPool;
  public Utxo: RawTxUtxo;
  public Vault: RawTxVault;

  constructor(private readonly utxoProvider: UtxoProviderService, scheduler: SchedulerRegistry) {
    this.queue = new QueueHandler(scheduler, 65000);

    this.Account = new RawTxAccount(this.call, utxoProvider);
    this.Masternode = new RawTxMasternode(this.call, utxoProvider);
    this.Pool = new RawTxPool(this.call, utxoProvider);
    this.Utxo = new RawTxUtxo(this.call, utxoProvider);
    this.Vault = new RawTxVault(this.call, utxoProvider);
  }

  public createWallet(seed: string[]): JellyfishWallet<WhaleWalletAccount, WalletHdNode> {
    return new JellyfishWallet(
      MnemonicHdNodeProvider.fromWords(seed, this.bip32OptionsBasedOn(JellyfishService.getNetwork())),
      new WhaleWalletAccountProvider(undefined, JellyfishService.getNetwork()),
      JellyfishWallet.COIN_TYPE_DFI,
      JellyfishWallet.PURPOSE_LIGHT_WALLET,
    );
  }

  public async signRawTx(rawTx: RawTxDto, account: WalletAccount): Promise<string> {
    const prevouts: Vout[] = rawTx.prevouts.map((p) => {
      return {
        // needs to be recreated as those are objects and not just data
        value: new BigNumber(p.value),
        script: {
          stack: toOPCodes(SmartBuffer.fromBuffer(Buffer.from(rawTx.scriptHex, 'hex'))),
        },
        tokenId: p.tokenId,
      };
    });
    const tx = new CTransactionSegWit(SmartBuffer.fromBuffer(Buffer.from(rawTx.hex, 'hex')));
    const signedTx = await account.signTx(tx, prevouts);
    return new CTransactionSegWit(signedTx).toHex();
  }

  private bip32OptionsBasedOn(network: Network): Bip32Options {
    return {
      bip32: {
        public: network.bip32.publicPrefix,
        private: network.bip32.privatePrefix,
      },
      wif: network.wifPrefix,
    };
  }

  async unlock(rawTx: RawTxDto): Promise<void> {
    return this.call(() => this.executeUnlockUtxos(rawTx.prevouts, rawTx.scriptHex));
  }

  private async executeUnlockUtxos(prevouts: Prevout[], scriptHex: string): Promise<void> {
    this.utxoProvider.unlockSpentBasedOn(prevouts, RawTxUtil.parseAddressFromScriptHex(scriptHex));
  }

  // --- HELPER METHODS --- //

  private call<T>(call: () => Promise<T>): Promise<T> {
    return this.queue.handle(() => call());
  }

  static getNetwork(): Network {
    return Config.network == 'testnet' ? TestNet : MainNet;
  }
}
