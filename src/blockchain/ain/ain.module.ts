import { Module } from '@nestjs/common';
import { SharedModule } from 'src/shared/shared.module';
import { JellyfishService } from './jellyfish/services/jellyfish.service';
import { RawTxService } from './jellyfish/services/raw-tx.service';
import { UtxoProviderService } from './jellyfish/services/utxo-provider.service';
import { NodeController } from './node/node.controller';
import { NodeService } from './node/node.service';
import { DeFiChainUtil } from './utils/defichain.util';
import { TokenProviderService } from './whale/token-provider.service';
import { WhaleService } from './whale/whale.service';

@Module({
  imports: [SharedModule],
  providers: [
    NodeService,
    WhaleService,
    JellyfishService,
    RawTxService,
    UtxoProviderService,
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
  controllers: [NodeController],
})
export class AinModule {}
