import { BlockchainAddress } from 'src/shared/models/blockchain-address';
import { IEntity } from 'src/shared/models/entity';
import { Column, Entity } from 'typeorm';

@Entity()
export class RewardRoute extends IEntity {
  @Column(() => BlockchainAddress)
  address: BlockchainAddress;
}
