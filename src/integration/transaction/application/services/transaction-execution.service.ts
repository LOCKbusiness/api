import { Injectable } from '@nestjs/common';
import { RawTxDto } from 'src/blockchain/ain/jellyfish/dto/raw-tx.dto';
import { JellyfishService } from 'src/blockchain/ain/jellyfish/jellyfish.service';
import { UtxoSizePriority } from 'src/blockchain/ain/jellyfish/utxo-provider.service';
import { DeFiClient } from 'src/blockchain/ain/node/defi-client';
import { NodeService, NodeType } from 'src/blockchain/ain/node/node.service';
import { WhaleClient } from 'src/blockchain/ain/whale/whale-client';
import { WhaleService } from 'src/blockchain/ain/whale/whale.service';
import { Config } from 'src/config/config';
import {
  CreateMasternodeData,
  MasternodeBaseData,
  MergeData,
  ResignMasternodeData,
  SendAccountData,
  SendFromLiqData,
  SendFromLiqToCustomerData,
  SendToLiqData,
  SplitData,
} from '../types/creation-data';
import { TransactionService } from './transaction.service';
import { WIF } from '@defichain/jellyfish-crypto';
import { CryptoService } from 'src/blockchain/shared/services/crypto.service';

@Injectable()
export class TransactionExecutionService {
  private nodeClient: DeFiClient;
  private whaleClient: WhaleClient;

  private privKey?: Buffer;

  constructor(
    private readonly transactionService: TransactionService,
    private readonly jellyfishService: JellyfishService,
    private readonly cryptoService: CryptoService,
    whaleService: WhaleService,
    nodeService: NodeService,
  ) {
    whaleService.getClient().subscribe((client) => (this.whaleClient = client));
    nodeService.getConnectedNode(NodeType.INPUT).subscribe((client) => (this.nodeClient = client));
  }

  async createMasternode(data: CreateMasternodeData): Promise<string> {
    const rawTx = await this.jellyfishService.rawTxForCreate(data.masternode);
    console.info(`Create masternode tx ${rawTx.id}`);
    return this.signAndBroadcast(rawTx, this.createPayloadFor(data));
  }

  async resignMasternode(data: ResignMasternodeData): Promise<string> {
    const rawTx = await this.jellyfishService.rawTxForResign(data.masternode);
    console.info(`Resign masternode tx ${rawTx.id}`);
    return this.signAndBroadcast(rawTx, this.createPayloadFor(data));
  }

  async sendFromLiq(data: SendFromLiqData): Promise<string> {
    const rawTx = await this.jellyfishService.rawTxForSendFromLiq(data.to, data.amount, data.sizePriority);
    console.info(`Send from liq tx ${rawTx.id}`);
    return this.signAndBroadcast(rawTx, this.createPayloadFor(data));
  }

  async sendFromLiqToCustomer(data: SendFromLiqToCustomerData): Promise<string> {
    const rawTx = await this.jellyfishService.rawTxForSendFromLiq(data.to, data.amount, UtxoSizePriority.FITTING);
    console.info(`Send from liq to customer tx ${rawTx.id}`);
    return this.signAndBroadcast(rawTx, { id: data.withdrawalId });
  }

  async sendToLiq(data: SendToLiqData): Promise<string> {
    const rawTx = await this.jellyfishService.rawTxForSendToLiq(data.from, data.amount);
    console.info(`Send to liq tx ${rawTx.id}`);
    return this.signAndBroadcast(rawTx, this.createPayloadFor(data));
  }

  async splitBiggestUtxo(data: SplitData): Promise<string> {
    const rawTx = await this.jellyfishService.rawTxForSplitUtxo(data.address, data.split);
    console.info(`Split tx ${rawTx.id}`);
    return this.signAndBroadcast(rawTx);
  }

  async mergeSmallestUtxos(data: MergeData): Promise<string> {
    const rawTx = await this.jellyfishService.rawTxForMergeUtxos(data.address, data.merge);
    console.info(`Merge tx ${rawTx.id}`);
    return this.signAndBroadcast(rawTx);
  }

  async sendAccount(data: SendAccountData): Promise<string> {
    const rawTx = await this.jellyfishService.rawTxForSendAccount(data.from, data.to, data.token, data.amount);
    console.info(`Send account tx ${rawTx.id}`);
    return this.signAndBroadcast(rawTx);
  }

  private createPayloadFor(data: MasternodeBaseData): any {
    return {
      ownerWallet: data.ownerWallet,
      accountIndex: data.accountIndex,
    };
  }

  private async signAndBroadcast(rawTx: RawTxDto, payload?: any): Promise<string> {
    try {
      const signature = await this.receiveSignatureFor(rawTx);
      const hex = await this.transactionService.sign(rawTx, signature, payload);
      console.info(`${rawTx.id} broadcasting`);
      return await this.whaleClient.sendRaw(hex);
    } catch (e) {
      await this.jellyfishService.unlock(rawTx);
      throw e;
    }
  }

  private async receiveSignatureFor(rawTx: RawTxDto): Promise<string> {
    if (!this.privKey) {
      const key = await this.nodeClient.dumpPrivKey(Config.staking.signature.address);
      this.privKey = await WIF.asEllipticPair(key).privateKey();
    }
    return this.cryptoService.signMessage(this.privKey, rawTx.hex);
  }
}
