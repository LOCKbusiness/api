import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import Strategy from 'passport-headerapikey';
import { Config } from 'src/config/config';

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(Strategy, 'api-key') {
  constructor() {
    super({ header: 'X-API-KEY', prefix: '' }, true, async (apiKey, done) => this.validate(apiKey, done));
  }

  private validate(apiKey: string, done: (error: Error, data) => void) {
    if (Config.kyc.kycSecret === apiKey) {
      done(null, true);
    } else {
      done(new UnauthorizedException(), null);
    }
  }
}
