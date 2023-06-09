import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Lock } from 'src/shared/lock';
import { Config, Process } from 'src/config/config';
import { MonitoringService } from '../application/services/monitoring.service';
import { MetricObserver } from '../metric.observer';
import { WhaleService } from 'src/blockchain/ain/whale/whale.service';
import { LockLogger } from 'src/shared/services/lock-logger';

interface WhaleState {
  index: number;
  isDown: boolean;
  error: string;
}

type WhalesState = WhaleState[];

@Injectable()
export class WhaleHealthObserver extends MetricObserver<WhalesState> {
  protected readonly logger = new LockLogger(WhaleHealthObserver);

  constructor(readonly monitoringService: MonitoringService, private readonly whaleService: WhaleService) {
    super(monitoringService, 'whale', 'health');
  }

  init(data: WhalesState) {
    this.emit(data);
  }

  @Cron(CronExpression.EVERY_MINUTE)
  @Lock(360)
  async fetch(): Promise<WhalesState> {
    if (Config.processDisabled(Process.MONITORING)) return;

    let state = await this.getState();
    state = this.handleErrors(state);

    this.emit(state);

    return state;
  }

  private async getState(): Promise<WhalesState> {
    const errors = await this.whaleService.checkWhales();

    return errors.map(({ index, message }) => ({
      index,
      isDown: !!message,
      error: message,
    }));
  }

  private handleErrors(state: WhalesState): WhalesState {
    // check, if swap required
    const preferredWhale = state.sort((a, b) => a.index - b.index).find((n) => !n.isDown);

    if (!preferredWhale) {
      // all available whales down
      this.logger.critical(`Whale is fully down.`);
    } else if (this.whaleService.getCurrentClient().index != preferredWhale.index) {
      // swap required
      this.whaleService.switchWhale(preferredWhale.index);
      this.logger.warn(`Whale switched to index ${preferredWhale.index}`);
    }

    return state;
  }
}
