import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlockchainModule } from 'src/blockchain/blockchain.module';
import { IntegrationModule } from 'src/integration/integration.module';
import { SharedModule } from 'src/shared/shared.module';
import { YieldMachineController } from './application/api/controllers/yield-machine.controller';
import { VaultRepository } from './application/repositories/vault.repository';
import { VaultService } from './application/services/vault.service';
import { YieldMachineService } from './application/services/yield-machine.service';

@Module({
  imports: [TypeOrmModule.forFeature([VaultRepository]), SharedModule, BlockchainModule, IntegrationModule],
  controllers: [YieldMachineController],
  providers: [VaultService, YieldMachineService],
  exports: [VaultService, YieldMachineService],
})
export class YieldMachineModule {}
