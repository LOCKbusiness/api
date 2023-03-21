import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Lock } from 'src/shared/lock';
import { Config, GetConfig, Process } from 'src/config/config';
import { MonitoringService } from '../application/services/monitoring.service';
import { MetricObserver } from '../metric.observer';
import { WhaleService } from 'src/blockchain/ain/whale/whale.service';

interface WhaleState {
  index: number;
  isDown: boolean;
  error: string;
}

type WhalesState = WhaleState[];

@Injectable()
export class WhaleHealthObserver extends MetricObserver<WhalesState> {
  constructor(readonly monitoringService: MonitoringService, private readonly whaleService: WhaleService) {
    super(monitoringService, 'whale', 'health');
  }

  init(data: WhalesState) {
    this.emit(data);
  }

  @Cron(CronExpression.EVERY_MINUTE)
  @Lock(360)
  async fetch(): Promise<WhalesState> {
    //if (Config.processDisabled(Process.MONITORING)) return;

    let state = await this.getState();

    state = await this.handleErrors(state);

    this.emit(state);

    return state;
  }

  private async getState(): Promise<WhalesState> {
    const errors = await this.whaleService.checkWhales();

    return GetConfig().whale.urls.map((_url, index) => ({
      index,
      isDown: errors.find((e) => e.index == index).message ? true : false,
      error: errors.find((e) => e.index == index).message,
    }));
  }

  private async handleErrors(state: WhalesState): Promise<WhalesState> {
    // check, if swap required
    const preferredNode = state.find((n) => !n.isDown);

    if (!preferredNode) {
      // all available nodes down
      console.error(`ALERT! Whale is fully down.`);
    } else if (this.whaleService.getCurrentClient().index != preferredNode.index) {
      // swap required
      this.whaleService.switchWhale(preferredNode.index);
      console.warn(`WARN. Whale switched to index ${preferredNode.index}`);
    }

    return state;
  }
}
