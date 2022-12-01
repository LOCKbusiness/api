import { Injectable } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { RewardRepository } from 'src/subdomains/staking/application/repositories/reward.repository';
import { StakingStrategy } from 'src/subdomains/staking/domain/enums';
import { getCustomRepository, In, IsNull, Not } from 'typeorm';
import { MonitoringService } from '../application/services/monitoring.service';
import { MetricObserver } from '../metric.observer';

interface PaymentData {
  lastOutputDates: LastOutputDates;
}

interface LastOutputDates {
  yieldMachineReward: Date;
  stakingReward: Date;
}

@Injectable()
export class PaymentObserver extends MetricObserver<PaymentData> {
  constructor(monitoringService: MonitoringService) {
    super(monitoringService, 'payment', 'combined');
  }

  @Interval(900000)
  async fetch() {
    const data = await this.getPayment();

    this.emit(data);

    return data;
  }

  // *** HELPER METHODS *** //

  private async getPayment(): Promise<PaymentData> {
    return {
      lastOutputDates: await this.getLastOutputDates(),
    };
  }

  private async getLastOutputDates(): Promise<LastOutputDates> {
    return {
      stakingReward: await getCustomRepository(RewardRepository)
        .findOne({
          order: { reinvestOutputDate: 'DESC' },
          where: { staking: { strategy: StakingStrategy.MASTERNODE } },
          relations: ['staking'],
        })
        .then((b) => b.reinvestOutputDate),
      yieldMachineReward: await getCustomRepository(RewardRepository)
        .findOne({
          order: { reinvestOutputDate: 'DESC' },
          where: { staking: { strategy: StakingStrategy.LIQUIDITY_MINING } },
          relations: ['staking'],
        })
        .then((b) => b.reinvestOutputDate),
    };
  }
}
