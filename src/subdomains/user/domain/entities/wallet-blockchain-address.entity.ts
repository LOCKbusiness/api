import { Blockchain } from 'src/shared/enums/blockchain.enum';
import { BlockchainAddress } from 'src/shared/models/blockchain-address';
import { Entity } from 'typeorm';

@Entity()
export class WalletBlockchainAddress extends BlockchainAddress {
  //*** FACTORY METHODS ***//

  static create(address: string, blockchain: Blockchain): WalletBlockchainAddress {
    const newAddress = new WalletBlockchainAddress();

    newAddress.address = address;
    newAddress.blockchain = blockchain;

    return newAddress;
  }
}
