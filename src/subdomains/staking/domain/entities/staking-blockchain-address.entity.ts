import { BlockchainAddress } from 'src/shared/models/blockchain-address';
import { Staking } from 'src/subdomains/staking/domain/entities/staking.entity';
import { Entity, OneToOne } from 'typeorm';

@Entity()
export class StakingBlockchainAddress extends BlockchainAddress {
  @OneToOne(() => Staking, (staking) => staking.depositAddress, { nullable: true })
  staking: Staking;

  //*** FACTORY METHODS ***//

  //*** PUBLIC API ***//

  assignStaking(staking: Staking): this {
    if (this.staking)
      throw new Error(`This address is already used for staking. AddressID: ${this.id}. StakingID: ${this.staking.id}`);

    this.staking = staking;

    return this;
  }
}
