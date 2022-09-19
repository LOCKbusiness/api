import { Asset } from 'src/shared/entities/asset.entity';
import { IEntity } from 'src/shared/entities/entity';
import { Entity, ManyToOne } from 'typeorm';
import { BlockchainAddress } from '../../../../shared/entities/blockchain-address.entity';
import { StakingAddressPurposes } from '../enums';
import { Staking } from './staking.entity';

@Entity()
export class Withdrawal extends IEntity {
  @ManyToOne(() => Staking, (staking) => staking.withdrawals, { eager: true, nullable: true })
  staking: Staking;

  @ManyToOne(() => Asset, { eager: true, nullable: false })
  asset: Asset;

  @ManyToOne(() => BlockchainAddress, { eager: true, nullable: false })
  withdrawalAddress: BlockchainAddress<StakingAddressPurposes.WITHDRAWAL>;
}
