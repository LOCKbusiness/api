import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Config } from 'src/config/config';

import { getClientIp } from '@supercharge/request-ip';
import { GeoLocationService } from 'src/subdomains/user/application/services/geo-location.service';
import { CountryService } from 'src/subdomains/user/application/services/country.service';
import { IpLogRepository } from 'src/subdomains/user/application/repositories/ip-log.repository';

@Injectable()
export class IpGuard implements CanActivate {
  constructor(
    private geoLocationService: GeoLocationService,
    private countryService: CountryService,
    private ipLogRepo: IpLogRepository,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const ip = getClientIp(req);
    const { country, result } = await this.checkIpCountry(ip);
    const address = req.body.address;

    const ipLog = this.ipLogRepo.create({
      ip,
      country,
      result,
      url: req.url,
      address,
    });
    await this.ipLogRepo.save(ipLog);
    if (!result) throw new ForbiddenException('The country of IP address is not allowed');
    return result;
  }

  private async checkIpCountry(userIp: string): Promise<{ country: string; result: boolean }> {
    if (Config.environment === 'loc') return { country: 'INTERN', result: true };
    const country = await this.geoLocationService.getCountry(userIp);
    if (!country) return { country, result: false };
    const countryObject = await this.countryService.getCountryBySymbol(country);

    return { country, result: countryObject?.ipEnable };
  }
}
