import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from 'src/subdomains/user/application/services/auth.service';
import { SharedModule } from 'src/shared/shared.module';
import { AuthController } from './api/controllers/auth.controller';
import { KycController } from './api/controllers/kyc.controller';
import { UserController } from './api/controllers/user.controller';
import { RefRepository } from './application/repositories/ref-repository';
import { UserRepository } from './application/repositories/user.repository';
import { WalletProviderRepository } from './application/repositories/wallet-provider.repository';
import { WalletRepository } from './application/repositories/wallet.repository';
import { Ref } from './domain/entities/ref.entity';
import { User } from './domain/entities/user.entity';
import { WalletProvider } from './domain/entities/wallet-provider.entity';
import { Wallet } from './domain/entities/wallet.entity';
import { GeoLocationService } from './application/services/geo-location.service';
import { KycService } from './application/services/kyc.service';
import { RefService } from './application/services/ref.service';
import { UserService } from './application/services/user.service';
import { WalletProviderService } from './application/services/wallet-provider.service';
import { WalletService } from './application/services/wallet.service';
import { BlockchainModule } from 'src/blockchain/blockchain.module';
import { NotificationModule } from 'src/integration/notification/notification.module';
import { DfxController } from './api/controllers/dfx.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Ref, WalletProvider, Wallet]),
    SharedModule,
    BlockchainModule,
    NotificationModule,
  ],
  controllers: [UserController, KycController, AuthController, DfxController],
  providers: [
    RefRepository,
    UserRepository,
    WalletProviderRepository,
    WalletRepository,
    UserService,
    WalletService,
    WalletProviderService,
    RefService,
    KycService,
    AuthService,
  ],
  exports: [UserService, WalletService],
})
export class UserModule {}
