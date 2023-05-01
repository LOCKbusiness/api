import BigNumber from 'bignumber.js';
import { Config } from 'src/config/config';
import { Masternode } from 'src/integration/masternode/domain/entities/masternode.entity';
import { MasternodeVote } from 'src/subdomains/staking/domain/enums';
import { RawTxDto } from '../dto/raw-tx.dto';
import { RawTxBase } from './raw-tx-base';
import { RawTxUtil } from './raw-tx-util';

export class RawTxMasternode extends RawTxBase {
  async create(masternode: Masternode, lockUtxo: boolean): Promise<RawTxDto> {
    return this.handle(() => this.createTx(masternode, lockUtxo));
  }

  async resign(masternode: Masternode, lockUtxo: boolean): Promise<RawTxDto> {
    return this.handle(() => this.resignTx(masternode, lockUtxo));
  }

  async vote(
    masternode: Masternode,
    proposalId: string,
    voteDecision: MasternodeVote,
    lockUtxo: boolean,
  ): Promise<RawTxDto> {
    return this.handle(() => this.voteTx(masternode, proposalId, voteDecision, lockUtxo));
  }

  private async createTx(masternode: Masternode, lockUtxo: boolean): Promise<RawTxDto> {
    const [ownerScript, ownerPubKeyHash] = RawTxUtil.parseAddress(masternode.owner);
    const [, operatorPubKeyHash] = RawTxUtil.parseLegacyAddress(masternode.operator);

    const expectedAmount = new BigNumber(
      Config.masternode.collateral + Config.masternode.creationFee + Config.masternode.fee,
    );
    const utxo = await this.utxoProvider.provideExactAmount(masternode.owner, expectedAmount, lockUtxo);

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

  private async resignTx(masternode: Masternode, lockUtxo: boolean): Promise<RawTxDto> {
    const [, ownerPubKeyHash] = RawTxUtil.parseAddress(masternode.owner);
    const [, operatorPubKeyHash] = RawTxUtil.parseLegacyAddress(masternode.operator);

    const expectedAmount = new BigNumber(Config.masternode.resignFee);
    const utxo = await this.utxoProvider.provideExactAmount(masternode.owner, expectedAmount, lockUtxo);

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

  private async voteTx(
    masternode: Masternode,
    proposalId: string,
    voteDecision: MasternodeVote,
    lockUtxo: boolean,
  ): Promise<RawTxDto> {
    const [, ownerPubKeyHash] = RawTxUtil.parseAddress(masternode.owner);

    const expectedAmount = new BigNumber(Config.masternode.voteFee);
    const utxo = await this.utxoProvider.provideExactAmount(masternode.owner, expectedAmount, lockUtxo);

    const vins = RawTxUtil.createVins(utxo.prevouts);
    const vouts = [RawTxUtil.createVoutVoteMasternode(masternode.creationHash, proposalId, voteDecision)];

    const witnesses = [RawTxUtil.createWitness([RawTxUtil.createWitnessScript(ownerPubKeyHash)])];

    return RawTxUtil.generateTx(utxo, vins, vouts, witnesses);
  }
}
