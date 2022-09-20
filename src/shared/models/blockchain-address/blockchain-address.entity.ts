import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { Column, Entity } from 'typeorm';
import { IEntity } from '../entity';

@Entity()
export class BlockchainAddress extends IEntity {
  @Column({ length: 256, nullable: false })
  address: string;

  @Column({ length: 256, nullable: false })
  blockchain: Blockchain;

  @Column({ length: 256, nullable: false })
  purpose: string;

  //*** FACTORY METHODS ***//

  static create(address: string, blockchain: Blockchain, purpose: string): BlockchainAddress {
    const _address = new BlockchainAddress();

    _address.address = address;
    _address.blockchain = blockchain;
    _address.purpose = purpose;

    return _address;
  }
}
