import { Blockchain } from 'src/shared/enums/blockchain.enum';

export class BlockchainAddress<T> {
  address: string;
  blockchain: Blockchain;
  purpose: T;

  static create<T>(
    address: string,
    blockchain: Blockchain,
    purpose: T,
  ): BlockchainAddress<T> {
    const _address = new BlockchainAddress<T>();

    _address.address = address;
    _address.blockchain = blockchain;
    _address.purpose = purpose;

    return _address;
  }
}
