import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SharedModule } from 'src/shared/shared.module';
import { PayoutOrderFactory } from './factories/payout-order.factory';
import { PayoutOrderRepository } from './repositories/payout-order.repository';
import { PayoutDeFiChainService } from './services/payout-defichain.service';
import { PayoutLogService } from './services/payout-log.service';
import { PayoutService } from './services/payout.service';
import { PayoutStrategiesFacade } from './strategies/payout/payout.facade';
import { PrepareStrategiesFacade } from './strategies/prepare/prepare.facade';
import { DeFiChainCoinStrategy as DeFiChainDfiStrategyPO } from './strategies/payout/impl/defichain-coin.strategy';
import { DeFiChainTokenStrategy as DeFiChainTokenStrategyPO } from './strategies/payout/impl/defichain-token.strategy';
import { DeFiChainStrategy as DeFiChainStrategyPR } from './strategies/prepare/impl/defichain.strategy';
import { PayoutController } from './payout.controller';
import { BlockchainModule } from 'src/blockchain/blockchain.module';
import { NotificationModule } from 'src/integration/notification/notification.module';
import { DexModule } from '../dex/dex.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PayoutOrderRepository]),
    BlockchainModule,
    SharedModule,
    DexModule,
    NotificationModule,
  ],
  controllers: [PayoutController],
  providers: [
    PayoutOrderFactory,
    PayoutLogService,
    PayoutService,
    PayoutDeFiChainService,
    PayoutStrategiesFacade,
    PrepareStrategiesFacade,
    DeFiChainDfiStrategyPO,
    DeFiChainTokenStrategyPO,
    DeFiChainStrategyPR,
  ],
  exports: [PayoutService],
})
export class PayoutModule {}
