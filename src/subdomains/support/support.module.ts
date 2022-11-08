import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CryptoService } from 'src/blockchain/shared/services/crypto.service';
import { SharedModule } from 'src/shared/shared.module';
import { StakingController } from '../staking/api/controllers/staking.controller';
import { StakingModule } from '../staking/staking.module';
import { AuthController } from '../user/api/controllers/auth.controller';
import { AuthService } from '../user/application/services/auth.service';
import { UserModule } from '../user/user.module';
import { SupportController } from './api/controllers/support.controller';

@Module({
  imports: [TypeOrmModule.forFeature([]), UserModule, StakingModule, SharedModule],
  controllers: [StakingController, SupportController, AuthController],
  providers: [AuthService, CryptoService],
  exports: [],
})
export class SupportModule {}
