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
  SendFromLiqData,
  SendFromLiqToCustomerData,
  SendToLiqData,
  SplitData,
} from '../types/creation-data';
import { TransactionService } from './transaction.service';

@Injectable()
export class TransactionExecutionService {
  private nodeClient: DeFiClient;
  private whaleClient: WhaleClient;

  constructor(
    private readonly transactionService: TransactionService,
    private readonly jellyfishService: JellyfishService,
    whaleService: WhaleService,
    nodeService: NodeService,
  ) {
    whaleService.getClient().subscribe((client) => (this.whaleClient = client));
    nodeService.getConnectedNode(NodeType.INPUT).subscribe((client) => (this.nodeClient = client));
  }

  async createMasternode(data: CreateMasternodeData): Promise<string> {
    const rawTx = await this.jellyfishService.rawTxForCreate(data.masternode);
    return this.signAndBroadcast(rawTx, this.createPayloadFor(data));
  }

  async resignMasternode(data: ResignMasternodeData): Promise<string> {
    const rawTx = await this.jellyfishService.rawTxForResign(data.masternode);
    return this.signAndBroadcast(rawTx, this.createPayloadFor(data));
  }

  async sendFromLiq(data: SendFromLiqData): Promise<string> {
    const rawTx = await this.jellyfishService.rawTxForSendFromLiq(data.to, data.amount, data.sizePriority);
    return this.signAndBroadcast(rawTx, this.createPayloadFor(data));
  }

  async sendFromLiqToCustomer(data: SendFromLiqToCustomerData): Promise<string> {
    const rawTx = await this.jellyfishService.rawTxForSendFromLiq(data.to, data.amount, UtxoSizePriority.BIG);
    return this.signAndBroadcast(rawTx, { id: data.withdrawalId });
  }

  async sendToLiq(data: SendToLiqData): Promise<string> {
    const rawTx = await this.jellyfishService.rawTxForSendToLiq(data.from, data.amount);
    return this.signAndBroadcast(rawTx, this.createPayloadFor(data));
  }

  async splitBiggestUtxo(data: SplitData): Promise<string> {
    const rawTx = await this.jellyfishService.rawTxForSplitUtxo(data.address, data.split);
    return this.signAndBroadcast(rawTx);
  }

  async mergeSmallestUtxos(data: MergeData): Promise<string> {
    const rawTx = await this.jellyfishService.rawTxForMergeUtxos(data.address, data.merge);
    return this.signAndBroadcast(rawTx);
  }

  private createPayloadFor(data: MasternodeBaseData): any {
    return {
      ownerWallet: data.ownerWallet,
      accountIndex: data.accountIndex,
    };
  }

  private async signAndBroadcast(rawTx: RawTxDto, payload?: any): Promise<string> {
    const signature = await this.receiveSignatureFor(rawTx);
    const hex = await this.transactionService.sign(rawTx, signature, payload);
    return await this.whaleClient.sendRaw(hex);
  }

  private async receiveSignatureFor(rawTx: RawTxDto): Promise<string> {
    return this.nodeClient.signMessage(Config.staking.signature.address, rawTx.hex);
  }
}
