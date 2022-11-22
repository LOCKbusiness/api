import { Injectable } from '@nestjs/common';
import { NodeService } from 'src/blockchain/ain/node/node.service';
import { MonitoringService } from '../application/services/monitoring.service';
import { MetricObserver } from '../metric.observer';

interface StakingExternalData {
  [deviceId: string]: Date;
}

@Injectable()
export class StakingExternalObserver extends MetricObserver<StakingExternalData> {
  constructor(monitoringService: MonitoringService, readonly nodeService: NodeService) {
    super(monitoringService, 'staking', 'external');
  }

  async onWebhook(deviceId: string): Promise<void> {
    const data = { ...this.$data.value, [deviceId]: new Date() };

    this.emit(data);
  }
}
