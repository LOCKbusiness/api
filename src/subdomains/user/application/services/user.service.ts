import { Injectable } from '@nestjs/common';
import { UserBlockchainAddress } from '../../domain/entities/user-blockchain-address.entity';
import { KYCStatus } from '../../domain/enums';

@Injectable()
export class UserService {
  async getWalletAddress(userId: number): Promise<UserBlockchainAddress> {
    return new UserBlockchainAddress();
  }

  async getKYCStatus(userId: number): Promise<KYCStatus> {
    return KYCStatus.SUCCESS;
  }
}
