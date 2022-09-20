import { Injectable } from '@nestjs/common';
import { BlockchainAddress } from 'src/shared/models/blockchain-address/blockchain-address.entity';
import { KYCStatus } from '../../domain/enums';

@Injectable()
export class UserService {
  async getWalletAddress(userId: number): Promise<BlockchainAddress> {
    return new BlockchainAddress();
  }

  async getKYCStatus(userId: number): Promise<KYCStatus> {
    return KYCStatus.SUCCESS;
  }
}
