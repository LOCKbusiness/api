import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import BigNumber from 'bignumber.js';
import { DeFiClient } from 'src/blockchain/ain/node/defi-client';
import { NodeService, NodeType } from 'src/blockchain/ain/node/node.service';
import { Config, Process } from 'src/config/config';
import { MonitoringService } from '../application/services/monitoring.service';
import { MetricObserver } from '../metric.observer';
import { LockLogger } from 'src/shared/services/lock-logger';

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
  protected readonly logger = new LockLogger(NodeBalanceObserver);

  private inpClient: DeFiClient;
  private rewClient: DeFiClient;

  constructor(monitoringService: MonitoringService, readonly nodeService: NodeService) {
    super(monitoringService, 'node', 'balance');

    nodeService.getConnectedNode(NodeType.INPUT).subscribe((client) => (this.inpClient = client));
    nodeService.getConnectedNode(NodeType.REW).subscribe((client) => (this.rewClient = client));
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async fetch(): Promise<NodeBalanceData> {
    if (Config.processDisabled(Process.MONITORING)) return;

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
