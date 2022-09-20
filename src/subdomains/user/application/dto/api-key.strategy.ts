import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import Strategy from 'passport-headerapikey';
import { Config } from 'src/config/config';

@Injectable()
export class HeaderApiKeyStrategy extends PassportStrategy(Strategy, 'api-key') {
  constructor() {
    super({ header: 'X-API-KEY', prefix: '' }, true, async (apiKey, done) => {
      return this.validate(apiKey, done);
    });
  }

  // eslint-disable-next-line @typescript-eslint/ban-types
  public validate = (apiKey: string, done: (error: Error, data) => {}) => {
    if (Config.kyc.kycSecret === apiKey) {
      done(null, true);
    }
    done(new UnauthorizedException(), null);
  };
}
