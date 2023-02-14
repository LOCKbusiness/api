import { GetConfig } from 'src/config/config';
import { Asset } from 'src/shared/models/asset/asset.entity';
import { IEntity } from 'src/shared/models/entity';
import { Util } from 'src/shared/util';
import { StakingStrategy } from 'src/subdomains/staking/domain/enums';
import { Column, Entity, ManyToOne } from 'typeorm';

@Entity()
export class StakingAnalytics extends IEntity {
  @ManyToOne(() => Asset, { nullable: false, eager: true })
  asset: Asset;

  @Column({ nullable: false })
  strategy: StakingStrategy;

  @Column({ type: 'float', nullable: true })
  apr: number;

  @Column({ type: 'float', nullable: true })
  apy: number;

  @Column({ type: 'integer', nullable: true })
  operatorCount: number;

  @Column({ type: 'float', nullable: true })
  tvl: number;

  //*** PUBLIC API ***//

  updateAnalytics(operatorCount: number, tvl: number): this {
    this.operatorCount = operatorCount;
    this.tvl = tvl;

    console.log(`Updated analytics for ${this.asset.name} ${this.strategy}`);

    return this;
  }

  static getAprPeriod(): { dateFrom: Date; dateTo: Date } {
    const dateTo = new Date();
    dateTo.setUTCHours(0, 0, 0, 0);
    const dateFrom = Util.daysBefore(GetConfig().staking.aprPeriod, dateTo);

    return { dateFrom, dateTo };
  }

  static calculateApy(apr: number): number {
    const apy = Math.pow(1 + apr / 365, 365) - 1;

    return Util.round(apy, 3);
  }
}
