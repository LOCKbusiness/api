import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SharedModule } from 'src/shared/shared.module';
import { PayoutOrderFactory } from './factories/payout-order.factory';
import { PayoutOrderRepository } from './repositories/payout-order.repository';
import { PayoutOrder } from './entities/payout-order.entity';
import { PayoutDeFiChainService } from './services/payout-defichain.service';
import { PayoutLogService } from './services/payout-log.service';
import { PayoutService } from './services/payout.service';
import { PayoutStrategiesFacade } from './strategies/payout/payout.facade';
import { PrepareStrategiesFacade } from './strategies/prepare/prepare.facade';
import { DeFiChainDfiStrategy as DeFiChainDfiStrategyPO } from './strategies/payout/impl/defichain-dfi.strategy';
import { DeFiChainDefaultStrategy as DeFiChainDefaultStrategyPO } from './strategies/payout/impl/defichain-default.strategy';
import { DeFiChainStrategy as DeFiChainStrategyPR } from './strategies/prepare/impl/defichain.strategy';
import { PayoutController } from './payout.controller';
import { BlockchainModule } from 'src/blockchain/blockchain.module';
import { NotificationModule } from 'src/integration/notification/notification.module';
import { DexModule } from '../dex/dex.module';

@Module({
  imports: [TypeOrmModule.forFeature([PayoutOrder]), BlockchainModule, SharedModule, DexModule, NotificationModule],
  controllers: [PayoutController],
  providers: [
    PayoutOrderRepository,
    PayoutOrderFactory,
    PayoutLogService,
    PayoutService,
    PayoutDeFiChainService,
    PayoutStrategiesFacade,
    PrepareStrategiesFacade,
    DeFiChainDfiStrategyPO,
    DeFiChainDefaultStrategyPO,
    DeFiChainStrategyPR,
  ],
  exports: [PayoutService],
})
export class PayoutModule {}
