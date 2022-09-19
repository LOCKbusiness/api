import { Injectable } from '@nestjs/common';
import { KYCStatus } from '../../domain/enums';

@Injectable()
export class UserService {
  async getKYCStatus(userId: number): Promise<KYCStatus> {
    return KYCStatus.SUCCESS;
  }
}
