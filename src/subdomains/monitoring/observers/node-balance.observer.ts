import { Injectable } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import BigNumber from 'bignumber.js';
import { DeFiClient } from 'src/blockchain/ain/node/defi-client';
import { NodeService, NodeType } from 'src/blockchain/ain/node/node.service';
import { MonitoringService } from '../application/services/monitoring.service';
import { MetricObserver } from '../metric.observer';

interface NodeBalanceData {
  balance: {
    defichain: {
      inp: {
        utxo: BigNumber;
        token: number;
      };
      rew: {
        utxo: BigNumber;
        token: number;
      };
    };
  };
}

@Injectable()
export class NodeBalanceObserver extends MetricObserver<NodeBalanceData> {
  private inpClient: DeFiClient;
  private rewClient: DeFiClient;

  constructor(monitoringService: MonitoringService, readonly nodeService: NodeService) {
    super(monitoringService, 'node', 'balance');

    nodeService.getConnectedNode(NodeType.INPUT).subscribe((client) => (this.inpClient = client));
    nodeService.getConnectedNode(NodeType.REW).subscribe((client) => (this.rewClient = client));
  }

  @Interval(900000)
  async fetch(): Promise<NodeBalanceData> {
    const data = await this.getNode();

    this.emit(data);

    return data;
  }

  // --- HELPER METHODS --- //
  private async getNode(): Promise<NodeBalanceData> {
    return {
      balance: {
        defichain: {
          inp: await this.inpClient.getNodeBalance(),
          rew: await this.rewClient.getNodeBalance(),
        },
      },
    };
  }
}
