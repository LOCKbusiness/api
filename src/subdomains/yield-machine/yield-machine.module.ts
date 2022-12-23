import { Module } from '@nestjs/common';
import { BlockchainModule } from 'src/blockchain/blockchain.module';
import { IntegrationModule } from 'src/integration/integration.module';
import { SharedModule } from 'src/shared/shared.module';
import { YieldMachineController } from './application/api/controllers/yield-machine.controller';
import { VaultManagementService } from './application/services/vault-management.service';
import { YieldMachineService } from './application/services/yield-machine.service';

@Module({
  imports: [SharedModule, BlockchainModule, IntegrationModule],
  controllers: [YieldMachineController],
  providers: [YieldMachineService, VaultManagementService],
  exports: [YieldMachineService, VaultManagementService],
})
export class YieldMachineModule {}
