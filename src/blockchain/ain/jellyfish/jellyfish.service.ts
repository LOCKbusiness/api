import { MainNet, Network, TestNet } from '@defichain/jellyfish-network';
import { CTransactionSegWit } from '@defichain/jellyfish-transaction';
import { JellyfishWallet, WalletHdNode } from '@defichain/jellyfish-wallet';
import { Bip32Options, MnemonicHdNodeProvider } from '@defichain/jellyfish-wallet-mnemonic';
import { WhaleWalletAccount, WhaleWalletAccountProvider } from '@defichain/whale-api-wallet';
import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { Config } from 'src/config/config';
import { Masternode } from 'src/integration/masternode/domain/entities/masternode.entity';
import { WhaleService } from '../whale/whale.service';
import { RawTxDto } from './dto/raw-tx.dto';
import { RawTxUtil } from './raw-tx-util';

@Injectable()
export class JellyfishService {
  constructor(private readonly whaleService: WhaleService) {}

  public createWallet(seed: string[]): JellyfishWallet<WhaleWalletAccount, WalletHdNode> {
    return new JellyfishWallet(
      MnemonicHdNodeProvider.fromWords(seed, this.bip32OptionsBasedOn(this.getNetwork())),
      new WhaleWalletAccountProvider(undefined, this.getNetwork()),
      JellyfishWallet.COIN_TYPE_DFI,
      JellyfishWallet.PURPOSE_LIGHT_WALLET,
    );
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
    const network = this.getNetwork();
    const [ownerScript, ownerPubKeyHash] = RawTxUtil.parseOwnerAddress(masternode.owner, network);
    const [operatorScript, operatorPubKeyHash] = RawTxUtil.parseOperatorPubKeyHash(masternode.operator, network);

    const expectedAmount = new BigNumber(
      Config.masternode.collateral + Config.masternode.creationFee + Config.masternode.fee,
    );
    const unspent = await this.whaleService.getUnspent(masternode.owner, expectedAmount);
    const [prevouts, scriptHex] = RawTxUtil.parseUnspent(unspent);

    const vins = RawTxUtil.createVins(prevouts);
    const vouts = [
      RawTxUtil.createVoutCreateMasternode(operatorPubKeyHash, masternode.timeLock),
      RawTxUtil.createVoutReturn(ownerScript),
    ];

    const witnesses = [
      RawTxUtil.createWitness([
        RawTxUtil.createWitnessScript(operatorScript, operatorPubKeyHash),
        RawTxUtil.createWitnessScript(ownerScript, ownerPubKeyHash),
      ]),
    ];

    const tx = RawTxUtil.createTxSegWit(vins, vouts, witnesses);

    return {
      hex: new CTransactionSegWit(tx).toHex(),
      scriptHex,
      prevouts,
    };
  }

  async rawTxForResign(masternode: Masternode): Promise<RawTxDto> {
    const network = this.getNetwork();

    const [ownerScript, ownerPubKeyHash] = RawTxUtil.parseOwnerAddress(masternode.owner, network);
    const [operatorScript, operatorPubKeyHash] = RawTxUtil.parseOperatorPubKeyHash(masternode.operator, network);

    const expectedAmount = new BigNumber(Config.masternode.resignFee);
    const unspent = await this.whaleService.getUnspent(masternode.owner, expectedAmount);
    const [prevouts, scriptHex] = RawTxUtil.parseUnspent(unspent);

    const vins = RawTxUtil.createVins(prevouts);
    const vouts = [RawTxUtil.createVoutResignMasternode(masternode.creationHash)];

    const witnesses = [
      RawTxUtil.createWitness([
        RawTxUtil.createWitnessScript(operatorScript, operatorPubKeyHash),
        RawTxUtil.createWitnessScript(ownerScript, ownerPubKeyHash),
      ]),
    ];

    const tx = RawTxUtil.createTxSegWit(vins, vouts, witnesses);

    return {
      hex: new CTransactionSegWit(tx).toHex(),
      scriptHex,
      prevouts,
    };
  }

  private getNetwork(): Network {
    return Config.network?.toLowerCase() === 'mainnet' ? MainNet : TestNet;
  }
}
