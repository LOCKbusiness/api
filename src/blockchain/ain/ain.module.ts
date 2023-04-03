import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SharedModule } from 'src/shared/shared.module';
import { UtxoReservationController } from './jellyfish/api/controllers/utxo-reservation.controller';
import { UtxoReservation } from './jellyfish/domain/utxo-reservation.entity';
import { UtxoReservationRepository } from './jellyfish/repositories/utxo-reservation.repository';
import { JellyfishService } from './jellyfish/services/jellyfish.service';
import { RawTxService } from './jellyfish/services/raw-tx.service';
import { UtxoManagerService } from './jellyfish/services/utxo-manager.service';
import { UtxoProviderService } from './jellyfish/services/utxo-provider.service';
import { UtxoReservationService } from './jellyfish/services/utxo-reservation.service';
import { NodeController } from './node/node.controller';
import { NodeService } from './node/node.service';
import { DeFiChainUtil } from './utils/defichain.util';
import { TokenProviderService } from './whale/token-provider.service';
import { WhaleService } from './whale/whale.service';

@Module({
  imports: [SharedModule, TypeOrmModule.forFeature([UtxoReservation])],
  providers: [
    NodeService,
    WhaleService,
    JellyfishService,
    RawTxService,
    UtxoReservationRepository,
    UtxoReservationService,
    UtxoProviderService,
    UtxoManagerService,
    TokenProviderService,
    DeFiChainUtil,
  ],
  exports: [
    NodeService,
    WhaleService,
    JellyfishService,
    RawTxService,
    UtxoProviderService,
    TokenProviderService,
    DeFiChainUtil,
  ],
  controllers: [NodeController, UtxoReservationController],
})
export class AinModule {}
