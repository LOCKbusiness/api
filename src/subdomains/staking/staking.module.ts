import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AinModule } from 'src/blockchain/ain/ain.module';
import { CryptoService } from 'src/blockchain/crypto.service';
import { AuthController } from 'src/shared/auth/auth.controller';
import { AuthService } from 'src/shared/services/auth.service';
import { SharedModule } from 'src/shared/shared.module';
import { UserModule } from '../user/user.module';
import { DepositController } from './api/controllers/deposit.controller';
import { StakingController } from './api/controllers/staking.controller';
import { StakingFactory } from './application/factories/staking.factory';
import { StakingRepository } from './application/repositories/staking.repository';
import { StakingDepositService } from './application/services/staking-deposit.service';
import { StakingService } from './application/services/staking.service';

@Module({
  imports: [TypeOrmModule.forFeature([StakingRepository]), AinModule, SharedModule, UserModule],
  controllers: [StakingController, DepositController, AuthController],
  providers: [StakingService, StakingDepositService, StakingFactory, AuthService, CryptoService],
  exports: [],
})
export class StakingModule {}
