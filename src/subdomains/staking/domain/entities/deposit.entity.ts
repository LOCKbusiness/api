import { Asset } from 'src/shared/entities/asset.entity';
import { IEntity } from 'src/shared/entities/entity';
import { Column, Entity, ManyToOne } from 'typeorm';
import { BlockchainAddress } from '../../../../shared/entities/blockchain-address.entity';
import { StakingAddressPurposes } from '../enums';
import { Staking } from './staking.entity';

@Entity()
export class Deposit extends IEntity {
  @ManyToOne(() => Staking, (staking) => staking.deposits, { eager: true, nullable: true })
  staking: Staking;

  @ManyToOne(() => Asset, { eager: true, nullable: false })
  asset: Asset;

  @Column({ type: 'float', nullable: false, default: 0 })
  amount: number;

  @ManyToOne(() => BlockchainAddress, { eager: true, nullable: false })
  depositAddress: BlockchainAddress<StakingAddressPurposes.DEPOSIT>;
}
