import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AinModule } from 'src/blockchain/ain/ain.module';
import { CryptoService } from 'src/blockchain/crypto.service';
import { AuthController } from 'src/shared/auth/auth.controller';
import { AuthService } from 'src/shared/services/auth.service';
import { SharedModule } from 'src/shared/shared.module';
import { UserModule } from '../user/user.module';
import { DepositController } from './api/controllers/deposit.controller';
import { MasternodeController } from './api/controllers/masternode.controller';
import { StakingController } from './api/controllers/staking.controller';
import { StakingFactory } from './application/factories/staking.factory';
import { MasternodeRepository } from './application/repositories/masternode.repository';
import { StakingRepository } from './application/repositories/staking.repository';
import { MasternodeService } from './application/services/masternode.service';
import { StakingDepositService } from './application/services/staking-deposit.service';
import { StakingService } from './application/services/staking.service';

@Module({
  imports: [TypeOrmModule.forFeature([StakingRepository, MasternodeRepository]), AinModule, SharedModule, UserModule],
  controllers: [StakingController, DepositController, AuthController, MasternodeController],
  providers: [StakingService, StakingDepositService, StakingFactory, AuthService, CryptoService, MasternodeService],
  exports: [],
})
export class StakingModule {}
