import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { Column, Entity } from 'typeorm';
import { IEntity } from './entity';

@Entity()
export class BlockchainAddress<T> extends IEntity {
  @Column({ length: 256, nullable: false })
  address: string;

  @Column({ length: 256, nullable: false })
  blockchain: Blockchain;

  @Column({ length: 256, nullable: false })
  purpose: T;

  //*** FACTORY METHODS ***//

  static create<T>(address: string, blockchain: Blockchain, purpose: T): BlockchainAddress<T> {
    const _address = new BlockchainAddress<T>();

    _address.address = address;
    _address.blockchain = blockchain;
    _address.purpose = purpose;

    return _address;
  }
}
