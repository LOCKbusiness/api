import { BlockchainAddress } from 'src/shared/models/blockchain-address';
import { Staking } from 'src/subdomains/staking/domain/entities/staking.entity';
import { Entity, OneToOne } from 'typeorm';

@Entity()
export class StakingBlockchainAddress extends BlockchainAddress {
  @OneToOne(() => Staking, (staking) => staking.depositAddress, { nullable: true })
  staking: Staking;
}
