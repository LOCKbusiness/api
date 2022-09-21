import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { Column, Entity } from 'typeorm';
import { IEntity } from '../entity';

@Entity()
export class BlockchainAddress extends IEntity {
  @Column({ length: 256, nullable: false })
  address: string;

  @Column({ length: 256, nullable: false })
  blockchain: Blockchain;

  //*** FACTORY METHODS ***//

  static create(address: string, blockchain: Blockchain): BlockchainAddress {
    const _address = new BlockchainAddress();

    _address.address = address;
    _address.blockchain = blockchain;

    return _address;
  }
}
