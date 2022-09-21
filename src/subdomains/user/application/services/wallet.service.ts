import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Config } from 'src/config/config';
import { Like } from 'typeorm';
import { User } from '../../domain/entities/user.entity';
import { Wallet } from '../../domain/entities/wallet.entity';
import { SignUpDto } from '../../../../shared/auth/auth-sign-up.dto';
import { UserDto } from '../dto/user.dto';
import { WalletRepository } from '../repositories/wallet.repository';
import { CountryService } from './country.service';
import { GeoLocationService } from './geo-location.service';
import { UserService } from './user.service';
import { WalletProviderService } from './wallet-provider.service';
import { WalletProvider } from '../../domain/entities/wallet-provider.entity';

@Injectable()
export class WalletService {
  constructor(
    private walletRepo: WalletRepository,
    private countryService: CountryService,
    private userService: UserService,
    private walletProviderService: WalletProviderService,
    private geoLocationService: GeoLocationService,
  ) {}

  async getWalletDto(walletId: number): Promise<UserDto> {
    const wallet = await this.walletRepo.findOne(walletId, { relations: ['user'] });
    if (!wallet) throw new NotFoundException('Wallet not found');

    return await this.toDto(wallet);
  }

  async getByAddress(address: string, needsRelation = false): Promise<Wallet> {
    return this.walletRepo.findOne({ where: { address }, relations: needsRelation ? ['user', 'walletProvider'] : [] });
  }

  async getKycIdByAddress(address: string): Promise<string> {
    const wallet = await this.walletRepo.findOne({
      where: { kycId: address },
      relations: ['user'],
    });

    if (!wallet) throw new NotFoundException('User not available');
    return wallet.user.kycId;
  }
  async createWallet(dto: SignUpDto, userIp: string, user?: User): Promise<Wallet> {
    const wallet = this.walletRepo.create(dto);

    wallet.ip = userIp;
    wallet.ipCountry = await this.checkIpCountry(userIp);
    wallet.walletProvider = await this.checkWalletProvider(dto.walletName);
    wallet.ref = await this.getNextRef();
    wallet.user = user ?? (await this.userService.createUser());

    return await this.walletRepo.save(wallet);
  }

  private async getNextRef(): Promise<string> {
    // get highest numerical ref
    const nextRef = await this.walletRepo
      .findOne({
        select: ['id', 'ref'],
        where: { ref: Like('%[0-9]-[0-9]%') },
        order: { ref: 'DESC' },
      })
      .then((u) => +u.ref.replace('-', '') + 1);

    const ref = nextRef.toString().padStart(6, '0');
    return `${ref.slice(0, 3)}-${ref.slice(3, 6)}`;
  }

  private async checkIpCountry(userIp: string): Promise<string> {
    const ipCountry = await this.geoLocationService.getCountry(userIp);

    const country = await this.countryService.getCountryBySymbol(ipCountry);
    if (!country?.ipEnable && Config.environment !== 'loc')
      throw new ForbiddenException('The country of IP address is not allowed');

    return ipCountry;
  }

  private async checkWalletProvider(name: string): Promise<WalletProvider> {
    const walletProvider = await this.walletProviderService.getWalletProviderByName(name);
    if (!walletProvider) throw new NotFoundException(`No wallet provider with name: ${name}`);

    return walletProvider;
  }

  // --- DTO --- //
  private async toDto(wallet: Wallet): Promise<UserDto> {
    return {
      address: wallet.address,
      mail: wallet.user?.mail,
      language: wallet.user?.language,
      kycStatus: wallet.user?.kycStatus,
      kycLink: `${Config.kyc.frontendUrl}/kyc?code=${wallet.user?.kycHash}`,
    };
  }
}
