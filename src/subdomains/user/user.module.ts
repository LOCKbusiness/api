import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from 'src/subdomains/user/application/services/auth.service';
import { SharedModule } from 'src/shared/shared.module';
import { AuthController } from './api/controllers/auth.controller';
import { KycController } from './api/controllers/kyc.controller';
import { UserController } from './api/controllers/user.controller';
import { CountryRepository } from './application/repositories/country.repository';
import { RefRepository } from './application/repositories/ref-repository';
import { UserRepository } from './application/repositories/user.repository';
import { WalletProviderRepository } from './application/repositories/wallet-provider.repository';
import { WalletRepository } from './application/repositories/wallet.repository';
import { CountryService } from './application/services/country.service';
import { GeoLocationService } from './application/services/geo-location.service';
import { KycService } from './application/services/kyc.service';
import { RefService } from './application/services/ref.service';
import { UserService } from './application/services/user.service';
import { WalletProviderService } from './application/services/wallet-provider.service';
import { WalletService } from './application/services/wallet.service';
import { BlockchainModule } from 'src/blockchain/blockchain.module';
import { NotificationModule } from 'src/integration/notification/notification.module';
import { StakingRepository } from '../staking/application/repositories/staking.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserRepository,
      CountryRepository,
      RefRepository,
      WalletProviderRepository,
      WalletRepository,
      StakingRepository,
    ]),
    SharedModule,
    BlockchainModule,
    NotificationModule,
  ],
  controllers: [UserController, KycController, AuthController],
  providers: [
    UserService,
    WalletService,
    CountryService,
    WalletProviderService,
    GeoLocationService,
    RefService,
    KycService,
    AuthService,
  ],
  exports: [UserService, WalletService],
})
export class UserModule {}
