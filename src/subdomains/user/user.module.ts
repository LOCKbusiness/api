import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SharedModule } from 'src/shared/shared.module';
import { UserController } from './api/controllers/user.controller';
import { HeaderApiKeyStrategy } from './application/dto/api-key.strategy';
import { CountryRepository } from './application/repositories/country.repository';
import { RefRepository } from './application/repositories/ref-repository';
import { UserRepository } from './application/repositories/user.repository';
import { WalletProviderRepository } from './application/repositories/wallet-provider.repository';
import { WalletRepository } from './application/repositories/wallet.repository';
import { CountryService } from './application/services/country.service';
import { GeoLocationService } from './application/services/geo-location.service';
import { RefService } from './application/services/ref.service';
import { UserService } from './application/services/user.service';
import { WalletProviderService } from './application/services/wallet-provider.service';
import { WalletService } from './application/services/wallet.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserRepository,
      CountryRepository,
      RefRepository,
      WalletProviderRepository,
      WalletRepository,
    ]),
    SharedModule,
  ],
  controllers: [UserController],
  providers: [
    UserService,
    WalletService,
    CountryService,
    WalletProviderService,
    GeoLocationService,
    RefService,
    HeaderApiKeyStrategy,
  ],
  exports: [UserService, WalletService],
})
export class UserModule {}
