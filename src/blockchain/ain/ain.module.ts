import { Module } from '@nestjs/common';
import { SharedModule } from 'src/shared/shared.module';
import { JellyfishService } from './jellyfish/services/jellyfish.service';
import { RawTxService } from './jellyfish/services/raw-tx.service';
import { UtxoProviderService } from './jellyfish/services/utxo-provider.service';
import { NodeController } from './node/node.controller';
import { NodeService } from './node/node.service';
import { TokenProviderService } from './whale/token-provider.service';
import { WhaleService } from './whale/whale.service';

@Module({
  imports: [SharedModule],
  providers: [NodeService, WhaleService, JellyfishService, RawTxService, UtxoProviderService, TokenProviderService],
  exports: [NodeService, WhaleService, JellyfishService, RawTxService, UtxoProviderService, TokenProviderService],
  controllers: [NodeController],
})
export class AinModule {}
