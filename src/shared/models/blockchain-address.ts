import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { Column } from 'typeorm';

export class BlockchainAddress {
  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  blockchain: Blockchain;

  //*** FACTORY METHODS ***//

  static create(address: string, blockchain: Blockchain): BlockchainAddress {
    const newAddress = new BlockchainAddress();

    newAddress.address = address;
    newAddress.blockchain = blockchain;

    return newAddress;
  }
}
