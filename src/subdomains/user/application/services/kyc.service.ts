import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { Method } from 'axios';
import { CryptoService } from 'src/blockchain/crypto.service';
import { Config } from 'src/config/config';
import { HttpError, HttpService } from 'src/shared/services/http.service';
import { User } from '../../domain/entities/user.entity';
import { UserService } from './user.service';
import { WalletService } from './wallet.service';

@Injectable()
export class KycService {
  constructor(
    private readonly http: HttpService,
    private readonly cryptoService: CryptoService,
    private readonly userService: UserService,
    private readonly walletService: WalletService,
  ) {}

  async startKyc(address: string): Promise<User> {
    const wallet = await this.walletService.getByAddress(address, true);
    if (!wallet) throw new BadRequestException('Wallet not found');
    const user = wallet.user;
    if (!user) throw new BadRequestException('User not found');
    if (user.kycHash) return user;
    user.kycId = await this.cryptoService.getAddress(user.id);
    const signature = await this.getSignature(user.id, user.kycId);
    const accessToken = await this.signUp(user.kycId, signature);
    const kycUser = await this.getUser(accessToken);

    return await this.userService.updateUser(user.id, { kycHash: kycUser.kycHash, mail: kycUser.mail });
  }

  async signUp(address: string, signature: string): Promise<string> {
    const { accessToken } = await this.callApi<{ accessToken }>('auth/signUp', 'POST', {
      address,
      signature,
      walletId: 7,
    });
    return accessToken;
  }

  async getSignMessage(address: string): Promise<{ message: string }> {
    return await this.callApi<{ message: string }>(`auth/signMessage?address=${address}`);
  }

  async getUser(accessToken: string): Promise<User> {
    return await this.callApi<User>(`user`, 'GET', undefined, accessToken);
  }
  // --- HELPER METHODS --- //

  async getSignature(userId: number, address: string): Promise<string> {
    const { message } = await this.getSignMessage(address);
    return await this.cryptoService.signMessage(userId, message);
  }

  private async callApi<T>(url: string, method: Method = 'GET', data?: any, auth?: string): Promise<T> {
    return this.request<T>(url, method, data, auth).catch((e: HttpError) => {
      throw new ServiceUnavailableException(e);
    });
  }

  private async request<T>(url: string, method: Method, data?: any, accessToken?: string): Promise<T> {
    try {
      return await this.http.request<T>({
        url: `${Config.kyc.apiUrl}/${url}`,
        method: method,
        data: data,
        headers: accessToken ? { Authorization: 'Bearer ' + accessToken } : undefined,
      });
    } catch (e) {
      throw e;
    }
  }
}
