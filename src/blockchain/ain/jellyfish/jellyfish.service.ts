import { MainNet, Network, TestNet } from '@defichain/jellyfish-network';
import { CTransactionSegWit } from '@defichain/jellyfish-transaction';
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

  async rawTxForCreate(masternode: Masternode): Promise<RawTxDto> {
    const network = this.getNetwork();
    const [ownerScript, ownerPubKeyHash] = RawTxUtil.parseOwnerAddress(masternode.owner, network);
    const [operatorScript, operatorPubKeyHash] = RawTxUtil.parseOperatorPubKeyHash(masternode.operator, network);

    const expectedAmount = new BigNumber(
      Config.masternode.collateral + Config.masternode.creationFee + Config.masternode.fee,
    );
    const unspent = await this.whaleService.getUnspent(masternode.owner, 1, expectedAmount);
    const [prevouts, scriptHex] = RawTxUtil.parseUnspent(unspent);

    const vins = RawTxUtil.createVins(prevouts);
    const vouts = [
      RawTxUtil.createVoutMasternode(operatorPubKeyHash, masternode.timeLock),
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

  private getNetwork(): Network {
    const chainNetwork = Config.network;
    switch (chainNetwork?.toLowerCase()) {
      case 'mainnet':
        return MainNet;
      default:
        return TestNet;
    }
  }
}
