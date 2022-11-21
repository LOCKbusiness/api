import { MainNet, Network, TestNet } from '@defichain/jellyfish-network';
import { CTransactionSegWit, Vout, toOPCodes } from '@defichain/jellyfish-transaction';
import { JellyfishWallet, WalletAccount, WalletHdNode } from '@defichain/jellyfish-wallet';
import { Bip32Options, MnemonicHdNodeProvider } from '@defichain/jellyfish-wallet-mnemonic';
import { WhaleWalletAccount, WhaleWalletAccountProvider } from '@defichain/whale-api-wallet';
import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { Config } from 'src/config/config';
import { RawTxDto } from '../dto/raw-tx.dto';
import { SmartBuffer } from 'smart-buffer';

@Injectable()
export class JellyfishService {
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

  // --- HELPER METHODS --- //

  static getNetwork(): Network {
    return Config.network == 'testnet' ? TestNet : MainNet;
  }
}
