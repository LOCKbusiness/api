import { Injectable } from '@nestjs/common';
import { BlockchainAddress } from './blockchain-address.entity';

@Injectable()
export class BlockchainAddressService {
  async getAvailableAddressFromPool(): Promise<BlockchainAddress> {
    return new BlockchainAddress();
  }
}
