import { Module } from '@nestjs/common';
import { BlockchainModule } from 'src/blockchain/blockchain.module';
import { IntegrationModule } from 'src/integration/integration.module';
import { SharedModule } from 'src/shared/shared.module';
import { YieldMachineController } from './application/api/controllers/yield-machine.controller';
import { YieldMachineService } from './application/services/yield-machine.service';

@Module({
  imports: [SharedModule, BlockchainModule, IntegrationModule],
  controllers: [YieldMachineController],
  providers: [YieldMachineService],
  exports: [YieldMachineService],
})
export class YieldMachineModule {}
