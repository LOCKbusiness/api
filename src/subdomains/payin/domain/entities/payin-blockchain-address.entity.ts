import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { BlockchainAddress } from 'src/shared/models/blockchain-address';
import { Entity } from 'typeorm';

@Entity()
export class PayInBlockchainAddress extends BlockchainAddress {
  //*** FACTORY METHODS ***//

  static create(address: string, blockchain: Blockchain): PayInBlockchainAddress {
    const newAddress = new PayInBlockchainAddress();

    newAddress.address = address;
    newAddress.blockchain = blockchain;

    return newAddress;
  }
}
