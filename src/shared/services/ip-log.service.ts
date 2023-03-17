import { Injectable } from '@nestjs/common';
import { Config } from 'src/config/config';
import { CountryService } from 'src/shared/services/country.service';
import { GeoLocationService } from 'src/subdomains/user/application/services/geo-location.service';
import { IpLog } from '../models/ip-log.entity';
import { IpLogRepository } from '../repositories/ip-log.repository';

@Injectable()
export class IpLogService {
  constructor(
    private geoLocationService: GeoLocationService,
    private countryService: CountryService,
    private ipLogRepo: IpLogRepository,
  ) {}

  async create(ip: string, url: string, address: string): Promise<IpLog> {
    const { country, result } = await this.checkIpCountry(ip);
    const ipLog = this.ipLogRepo.create({
      ip,
      country,
      result,
      url,
      address,
    });
    return this.ipLogRepo.save(ipLog);
  }

  private async checkIpCountry(userIp: string): Promise<{ country: string; result: boolean }> {
    if (Config.environment === 'loc') return { country: 'INTERN', result: true };
    const country = await this.geoLocationService.getCountry(userIp);
    if (!country) return { country, result: false };
    const countryObject = await this.countryService.getCountryBySymbol(country);

    return { country, result: countryObject?.ipEnable };
  }
}
