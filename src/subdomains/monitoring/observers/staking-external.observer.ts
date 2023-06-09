import { Injectable } from '@nestjs/common';
import { NodeService } from 'src/blockchain/ain/node/node.service';
import { MonitoringService } from '../application/services/monitoring.service';
import { MetricObserver } from '../metric.observer';
import { LockLogger } from 'src/shared/services/lock-logger';

interface StakingExternalData {
  [deviceId: string]: Date;
}

@Injectable()
export class StakingExternalObserver extends MetricObserver<StakingExternalData> {
  protected readonly logger = new LockLogger(StakingExternalObserver);

  constructor(monitoringService: MonitoringService, readonly nodeService: NodeService) {
    super(monitoringService, 'staking', 'external');
  }

  init(data: StakingExternalData) {
    // map to date objects
    Object.keys(data).forEach((key) => (data[key] = new Date(data[key])));

    this.emit(data);
  }

  async onWebhook(deviceId: string): Promise<void> {
    const data = { ...this.data, [deviceId]: new Date() };

    this.emit(data);
  }
}
