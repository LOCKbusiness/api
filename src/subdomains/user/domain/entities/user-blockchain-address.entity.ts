import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { BlockchainAddress } from 'src/shared/models/blockchain-address';
import { Entity } from 'typeorm';

@Entity()
export class UserBlockchainAddress extends BlockchainAddress {
  //*** FACTORY METHODS ***//

  static create(address: string, blockchain: Blockchain): UserBlockchainAddress {
    const newAddress = new UserBlockchainAddress();

    newAddress.address = address;
    newAddress.blockchain = blockchain;

    return newAddress;
  }
}
