import { Injectable } from '@nestjs/common';
import { RawTxDto } from 'src/blockchain/ain/jellyfish/dto/raw-tx.dto';
import { JellyfishService } from 'src/blockchain/ain/jellyfish/jellyfish.service';
import { DeFiClient } from 'src/blockchain/ain/node/defi-client';
import { NodeService, NodeType } from 'src/blockchain/ain/node/node.service';
import { WhaleClient } from 'src/blockchain/ain/whale/whale-client';
import { WhaleService } from 'src/blockchain/ain/whale/whale.service';
import { Config } from 'src/config/config';
import { CreateMasternodeData, ResignMasternodeData, SendFromLiqData, SendToLiqData } from '../types/creation-data';
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

  private async receiveSignatureFor(rawTx: RawTxDto): Promise<string> {
    return this.nodeClient.signMessage(Config.staking.signature.address, rawTx.hex);
  }

  async createMasternode(data: CreateMasternodeData): Promise<string> {
    const rawTx = await this.jellyfishService.rawTxForCreate(data.masternode);
    return this.signAndBroadcast(rawTx, {
      ownerWallet: data.ownerWallet,
      accountIndex: data.accountIndex,
    });
  }

  async resignMasternode(data: ResignMasternodeData): Promise<string> {
    const rawTx = await this.jellyfishService.rawTxForResign(data.masternode);
    return this.signAndBroadcast(rawTx, {
      ownerWallet: data.ownerWallet,
      accountIndex: data.accountIndex,
    });
  }

  async sendFromLiq(data: SendFromLiqData): Promise<string> {
    const rawTx = await this.jellyfishService.rawTxForSendFromLiq(data.to, data.amount);
    return this.signAndBroadcast(rawTx, {
      ownerWallet: data.ownerWallet,
      accountIndex: data.accountIndex,
    });
  }

  async sendToLiq(data: SendToLiqData): Promise<string> {
    const rawTx = await this.jellyfishService.rawTxForSendToLiq(data.from, data.amount);
    return this.signAndBroadcast(rawTx, {
      ownerWallet: data.ownerWallet,
      accountIndex: data.accountIndex,
    });
  }

  private async signAndBroadcast(rawTx: RawTxDto, payload?: any): Promise<string> {
    const signature = await this.receiveSignatureFor(rawTx);
    const hex = await this.transactionService.sign(rawTx, signature, payload);
    return await this.whaleClient.sendRaw(hex);
  }
}
