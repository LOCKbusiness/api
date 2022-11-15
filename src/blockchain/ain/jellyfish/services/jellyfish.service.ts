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
import { Masternode } from 'src/integration/masternode/domain/entities/masternode.entity';
import { QueueHandler } from 'src/shared/queue-handler';
import { RawTxDto } from '../dto/raw-tx.dto';
import { RawTxUtil } from '../utils/raw-tx-util';
import { UtxoProviderService } from './utxo-provider.service';
import { SmartBuffer } from 'smart-buffer';
import { UtxoSizePriority } from '../domain/enums';
import { RawTxMasternode } from '../utils/raw-tx-masternode';
import { RawTxVault } from '../utils/raw-tx-vault';
import { RawTxUtxo } from '../utils/raw-tx-utxo';
import { RawTxAccount } from '../utils/raw-tx-account';
import { RawTxPool } from '../utils/raw-tx-pool';

@Injectable()
export class JellyfishService {
  private readonly queue: QueueHandler;
  constructor(private readonly utxoProvider: UtxoProviderService, scheduler: SchedulerRegistry) {
    this.queue = new QueueHandler(scheduler, 65000);
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

  async rawTxForCreate(masternode: Masternode): Promise<RawTxDto> {
    return this.call(() => RawTxMasternode.create(masternode, this.utxoProvider));
  }

  async rawTxForResign(masternode: Masternode): Promise<RawTxDto> {
    return this.call(() => RawTxMasternode.resign(masternode, this.utxoProvider));
  }

  async rawTxForSendFromTo(from: string, to: string, amount: BigNumber, useFeeBuffer: boolean): Promise<RawTxDto> {
    return this.call(() => RawTxUtxo.sendFromTo(from, to, amount, useFeeBuffer, this.utxoProvider));
  }

  async rawTxForSendFromLiq(to: string, amount: BigNumber, sizePriority: UtxoSizePriority): Promise<RawTxDto> {
    return this.call(() => RawTxUtxo.sendFromLiq(to, amount, sizePriority, this.utxoProvider));
  }

  async rawTxForSendToLiq(from: string, amount: BigNumber): Promise<RawTxDto> {
    return this.call(() => RawTxUtxo.sendToLiq(from, amount, this.utxoProvider));
  }

  async rawTxForSplitUtxo(address: string, split: number): Promise<RawTxDto> {
    return this.call(() => RawTxUtxo.split(address, split, this.utxoProvider));
  }

  async rawTxForMergeUtxos(address: string, merge: number): Promise<RawTxDto> {
    return this.call(() => RawTxUtxo.merge(address, merge, this.utxoProvider));
  }

  async unlock(rawTx: RawTxDto): Promise<void> {
    return this.call(() => this.executeUnlockUtxos(rawTx.prevouts, rawTx.scriptHex));
  }

  async rawTxForForwardAccountToLiq(from: string, token: number, amount: BigNumber): Promise<RawTxDto> {
    return this.call(() => RawTxAccount.sendToLiq(from, token, amount, this.utxoProvider));
  }

  async rawTxForSendAccount(from: string, to: string, token: number, amount: BigNumber): Promise<RawTxDto> {
    return this.call(() => RawTxAccount.sendFromTo(from, to, token, amount, this.utxoProvider));
  }

  async rawTxForCreateVault(owner: string): Promise<RawTxDto> {
    return this.call(() => RawTxVault.create(owner, this.utxoProvider));
  }

  async rawTxForDepositToVault(from: string, vault: string, token: number, amount: BigNumber): Promise<RawTxDto> {
    return this.call(() => RawTxVault.deposit(from, vault, token, amount, this.utxoProvider));
  }

  async rawTxForWithdrawFromVault(to: string, vault: string, token: number, amount: BigNumber): Promise<RawTxDto> {
    return this.call(() => RawTxVault.withdraw(to, vault, token, amount, this.utxoProvider));
  }

  async rawTxForTakeLoan(to: string, vault: string, token: number, amount: BigNumber): Promise<RawTxDto> {
    return this.call(() => RawTxVault.takeLoan(to, vault, token, amount, this.utxoProvider));
  }

  async rawTxForPaybackLoan(from: string, vault: string, token: number, amount: BigNumber): Promise<RawTxDto> {
    return this.call(() => RawTxVault.paybackLoan(from, vault, token, amount, this.utxoProvider));
  }

  async rawTxForAddPoolLiquidity(
    from: string,
    tokenA: number,
    amountA: BigNumber,
    tokenB: number,
    amountB: BigNumber,
  ): Promise<RawTxDto> {
    return this.call(() => RawTxPool.add(from, tokenA, amountA, tokenB, amountB, this.utxoProvider));
  }

  async rawTxForRemovePoolLiquidity(from: string, token: number, amount: BigNumber): Promise<RawTxDto> {
    return this.call(() => RawTxPool.remove(from, token, amount, this.utxoProvider));
  }

  async rawTxForCompositeSwap(
    from: string,
    fromToken: number,
    fromAmount: BigNumber,
    toToken: number,
  ): Promise<RawTxDto> {
    return this.call(() => RawTxAccount.swap(from, fromToken, fromAmount, toToken, this.utxoProvider));
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
