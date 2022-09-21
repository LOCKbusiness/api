import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AinModule } from 'src/blockchain/ain/ain.module';
import { SharedModule } from 'src/shared/shared.module';
import { UserModule } from 'src/subdomains/user/user.module';
import { PayInFactory } from './application/factories/payin.factory';
import { PayInRepository } from './application/repositories/payin.repository';
import { PayInService } from './application/services/payin.service';
import { PayInDeFiChainService } from './infrastructure/payin-crypto-defichain.service';

@Module({
  imports: [TypeOrmModule.forFeature([PayInRepository]), AinModule, SharedModule, UserModule],
  controllers: [],
  providers: [PayInService, PayInDeFiChainService, PayInFactory],
  exports: [PayInService],
})
export class PayInModule {}
