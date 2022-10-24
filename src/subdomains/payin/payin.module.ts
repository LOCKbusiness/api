import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlockchainModule } from 'src/blockchain/blockchain.module';
import { SharedModule } from 'src/shared/shared.module';
import { UserModule } from 'src/subdomains/user/user.module';
import { PayInFactory } from './application/factories/payin.factory';
import { PayInBlockchainAddressRepository } from './application/repositories/payin-blockchain-address.repository';
import { PayInRepository } from './application/repositories/payin.repository';
import { PayInService } from './application/services/payin.service';
import { PayInDeFiChainService } from './infrastructure/payin-crypto-defichain.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PayInRepository, PayInBlockchainAddressRepository]),
    BlockchainModule,
    SharedModule,
    UserModule,
  ],
  controllers: [],
  providers: [PayInService, PayInDeFiChainService, PayInFactory],
  exports: [PayInService],
})
export class PayInModule {}
