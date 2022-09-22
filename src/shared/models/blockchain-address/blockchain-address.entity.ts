import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { Staking } from 'src/subdomains/staking/domain/entities/staking.entity';
import { Column, Entity, OneToOne } from 'typeorm';
import { IEntity } from '../entity';

@Entity()
export class BlockchainAddress extends IEntity {
  @Column({ length: 256, nullable: false })
  address: string;

  @Column({ length: 256, nullable: false })
  blockchain: Blockchain;

  @OneToOne(() => Staking, (staking) => staking.depositAddress, { nullable: true })
  staking: Staking;

  //*** PUBLIC API ***//

  assignStaking(staking: Staking): this {
    if (this.staking)
      throw new Error(`This address is already used for staking. AddressID: ${this.id}. StakingID: ${this.staking.id}`);

    this.staking = staking;

    return this;
  }
}
