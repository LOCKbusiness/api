import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AinModule } from 'src/blockchain/ain/ain.module';
import { SharedModule } from 'src/shared/shared.module';
import { UserModule } from 'src/subdomains/user/user.module';
import { PayInCryptoRepository } from './application/repositories/payin-crypto.repository';
import { PayInCryptoService } from './application/services/payin-crypto.service';
import { PayInCryptoDeFiChainService } from './infrastructure/payin-crypto-defichain.service';

@Module({
  imports: [TypeOrmModule.forFeature([PayInCryptoRepository]), AinModule, SharedModule, UserModule],
  controllers: [],
  providers: [PayInCryptoService, PayInCryptoDeFiChainService],
  exports: [],
})
export class PayInCryptoModule {}
