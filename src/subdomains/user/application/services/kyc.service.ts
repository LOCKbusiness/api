import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { Method } from 'axios';
import { CryptoService } from 'src/blockchain/crypto.service';
import { Config } from 'src/config/config';
import { HttpError, HttpService } from 'src/shared/services/http.service';
import { User } from '../../domain/entities/user.entity';
import { KycDto } from '../dto/kyc.dto';
import { UserService } from './user.service';

@Injectable()
export class KycService {
  constructor(
    private readonly http: HttpService,
    private readonly cryptoService: CryptoService,
    private readonly userService: UserService,
  ) {}

  async startKyc(userId: number): Promise<KycDto> {
    const user = await this.userService.getUser(userId);

    //Check if KYC has already started
    if (user.kycHash) return this.toDto(user);

    //Register at KYC provider
    const wallet = this.cryptoService.createWallet(Config.kyc.phrase);
    user.kycId = await wallet.get(userId).getAddress();
    const signature = await this.getSignature(await wallet.get(userId).privateKey(), user.kycId);
    const accessToken = await this.signUp(user.kycId, signature);
    const kycUser = await this.getUser(accessToken);

    return this.toDto(
      await this.userService.updateUser(user.id, {
        kycHash: kycUser.kycHash,
        kycId: user.kycId,
      }),
    );
  }

  // --- HELPER METHODS --- //

  private async signUp(address: string, signature: string): Promise<string> {
    const { accessToken } = await this.callApi<{ accessToken }>('auth/signUp', 'POST', {
      address,
      signature,
      wallet: 7,
    });
    return accessToken;
  }

  private async getSignMessage(address: string): Promise<{ message: string }> {
    return await this.callApi<{ message: string }>(`auth/signMessage?address=${address}`);
  }

  private async getUser(accessToken: string): Promise<User> {
    return await this.callApi<User>(`user`, 'GET', undefined, accessToken);
  }

  private async getSignature(privKey: Buffer, address: string): Promise<string> {
    const { message } = await this.getSignMessage(address);
    return await this.cryptoService.signMessage(privKey, message);
  }

  private async callApi<T>(url: string, method: Method = 'GET', data?: any, auth?: string): Promise<T> {
    return this.request<T>(url, method, data, auth).catch((e: HttpError) => {
      throw new ServiceUnavailableException(e);
    });
  }

  private async request<T>(url: string, method: Method, data?: any, accessToken?: string): Promise<T> {
    return await this.http.request<T>({
      url: `${Config.kyc.apiUrl}/${url}`,
      method: method,
      data: data,
      headers: accessToken ? { Authorization: 'Bearer ' + accessToken } : undefined,
    });
  }

  // --- DTO --- //
  private async toDto(user: User): Promise<KycDto> {
    return {
      mail: user.mail,
      language: user.language,
      kycStatus: user.kycStatus,
      kycLink: `${Config.kyc.frontendUrl}/kyc?code=${user.kycHash}`,
    };
  }
}
