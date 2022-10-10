import { MainNet, Network, TestNet } from '@defichain/jellyfish-network';
import { CTransaction, CTransactionSegWit } from '@defichain/jellyfish-transaction';
import { calculateFeeP2WPKH } from '@defichain/jellyfish-transaction-builder';
import { JellyfishWallet, WalletHdNode } from '@defichain/jellyfish-wallet';
import { Bip32Options, MnemonicHdNodeProvider } from '@defichain/jellyfish-wallet-mnemonic';
import { WhaleWalletAccount, WhaleWalletAccountProvider } from '@defichain/whale-api-wallet';
import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { Config } from 'src/config/config';
import { Masternode } from 'src/integration/masternode/domain/entities/masternode.entity';
import { WhaleClient } from '../whale/whale-client';
import { WhaleService } from '../whale/whale.service';
import { RawTxDto } from './dto/raw-tx.dto';
import { RawTxUtil } from './raw-tx-util';

@Injectable()
export class JellyfishService {
  private whaleClient: WhaleClient;

  constructor(whaleService: WhaleService) {
    whaleService.getClient().subscribe((client) => (this.whaleClient = client));
  }

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
    const [ownerScript, ownerPubKeyHash] = RawTxUtil.parseAddress(masternode.owner, network);
    const [operatorScript, operatorPubKeyHash] = RawTxUtil.parseOperatorPubKeyHash(masternode.operator, network);

    const expectedAmount = new BigNumber(
      Config.masternode.collateral + Config.masternode.creationFee + Config.masternode.fee,
    );
    const unspent = await this.whaleClient.getUnspent(masternode.owner, expectedAmount);
    const [prevouts, scriptHex] = RawTxUtil.parseUnspent(unspent);

    const vins = RawTxUtil.createVins(prevouts);
    const vouts = [
      RawTxUtil.createVoutCreateMasternode(operatorPubKeyHash, masternode.timeLock),
      RawTxUtil.createVoutReturn(ownerScript, new BigNumber(Config.masternode.collateral)),
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

    const [ownerScript, ownerPubKeyHash] = RawTxUtil.parseAddress(masternode.owner, network);
    const [operatorScript, operatorPubKeyHash] = RawTxUtil.parseOperatorPubKeyHash(masternode.operator, network);

    const expectedAmount = new BigNumber(Config.masternode.resignFee);
    const unspent = await this.whaleClient.getUnspent(masternode.owner, expectedAmount);
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

  async rawTxForSendFromLiq(to: string, amount: BigNumber): Promise<RawTxDto> {
    const network = this.getNetwork();

    const [fromScript] = RawTxUtil.parseAddress(Config.staking.liquidity.address, network);
    const [toScript] = RawTxUtil.parseAddress(to, network);

    const unspent = await this.whaleClient.getAllUnspent(Config.staking.liquidity.address);
    const [prevouts, total] = RawTxUtil.parseUnspentUntilAmount(unspent, amount);

    const vins = RawTxUtil.createVins(prevouts);
    const change = RawTxUtil.createVoutReturn(fromScript, total.minus(amount));
    const vouts = [RawTxUtil.createVoutReturn(toScript, amount), change];

    const tx = RawTxUtil.createTx(vins, vouts);
    const fee = calculateFeeP2WPKH(new BigNumber(0.00001), tx);
    change.value = change.value.minus(fee);

    return {
      hex: new CTransaction(tx).toHex(),
      prevouts: prevouts,
    };
  }

  async rawTxForSendToLiq(from: string, amount: BigNumber): Promise<RawTxDto> {
    // TODO (Krysh) implement raw tx
    return {
      hex: '',
      scriptHex: '',
      prevouts: [],
    };
  }

  private getNetwork(): Network {
    return Config.network?.toLowerCase() === 'mainnet' ? MainNet : TestNet;
  }
}
