import { Injectable } from '@nestjs/common';
import { Config } from 'src/config/config';
import { CountryService } from 'src/shared/services/country.service';
import { GeoLocationService } from 'src/subdomains/user/application/services/geo-location.service';
import { WalletRole } from '../auth/wallet-role.enum';
import { IpLog } from '../entities/ip-log.entity';
import { IpLogRepository } from '../repositories/ip-log.repository';
import { RepositoryFactory } from '../repositories/repository.factory';

@Injectable()
export class IpLogService {
  constructor(
    private geoLocationService: GeoLocationService,
    private countryService: CountryService,
    private ipLogRepo: IpLogRepository,
    private readonly repos: RepositoryFactory,
  ) {}

  async create(ip: string, url: string, address: string): Promise<IpLog> {
    const { country, result } = await this.checkIpCountry(ip, address);
    const ipLog = this.ipLogRepo.create({
      ip,
      country,
      result,
      url,
      address,
    });
    return this.ipLogRepo.save(ipLog);
  }

  private async checkIpCountry(userIp: string, address: string): Promise<{ country: string; result: boolean }> {
    if (Config.environment === 'loc') return { country: 'INTERN', result: true };
    const country = await this.geoLocationService.getCountry(userIp);
    const countryObject = await this.countryService.getCountryBySymbol(country);

    const wallet = await this.repos.wallet.findOne({ where: { address: { address } } });
    if (!countryObject || (wallet && wallet.role != WalletRole.USER)) return { country, result: true };

    return { country, result: countryObject?.ipEnable };
  }
}
