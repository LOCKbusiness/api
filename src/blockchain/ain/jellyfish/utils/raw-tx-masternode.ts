import BigNumber from 'bignumber.js';
import { Config } from 'src/config/config';
import { Masternode } from 'src/integration/masternode/domain/entities/masternode.entity';
import { RawTxDto } from '../dto/raw-tx.dto';
import { UtxoProviderService } from '../services/utxo-provider.service';
import { RawTxUtil } from './raw-tx-util';

export class RawTxMasternode {
  static async create(masternode: Masternode, utxoProvider: UtxoProviderService): Promise<RawTxDto> {
    const [ownerScript, ownerPubKeyHash] = RawTxUtil.parseAddress(masternode.owner);
    const [, operatorPubKeyHash] = RawTxUtil.parseOperatorPubKeyHash(masternode.operator);

    const expectedAmount = new BigNumber(
      Config.masternode.collateral + Config.masternode.creationFee + Config.masternode.fee,
    );
    const utxo = await utxoProvider.provideExactAmount(masternode.owner, expectedAmount);

    const vins = RawTxUtil.createVins(utxo.prevouts);
    const vouts = [
      RawTxUtil.createVoutCreateMasternode(operatorPubKeyHash, masternode.timeLock),
      RawTxUtil.createVoutReturn(ownerScript, new BigNumber(Config.masternode.collateral)),
    ];

    const witnesses = [
      RawTxUtil.createWitness([
        RawTxUtil.createWitnessScript(operatorPubKeyHash),
        RawTxUtil.createWitnessScript(ownerPubKeyHash),
      ]),
    ];

    return RawTxUtil.generateTx(utxo, vins, vouts, witnesses);
  }

  static async resign(masternode: Masternode, utxoProvider: UtxoProviderService): Promise<RawTxDto> {
    const [, ownerPubKeyHash] = RawTxUtil.parseAddress(masternode.owner);
    const [, operatorPubKeyHash] = RawTxUtil.parseOperatorPubKeyHash(masternode.operator);

    const expectedAmount = new BigNumber(Config.masternode.resignFee);
    const utxo = await utxoProvider.provideExactAmount(masternode.owner, expectedAmount);

    const vins = RawTxUtil.createVins(utxo.prevouts);
    const vouts = [RawTxUtil.createVoutResignMasternode(masternode.creationHash)];

    const witnesses = [
      RawTxUtil.createWitness([
        RawTxUtil.createWitnessScript(operatorPubKeyHash),
        RawTxUtil.createWitnessScript(ownerPubKeyHash),
      ]),
    ];

    return RawTxUtil.generateTx(utxo, vins, vouts, witnesses);
  }
}
