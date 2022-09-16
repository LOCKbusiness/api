import { Module } from '@nestjs/common';
import { SharedModule } from 'src/shared/shared.module';
import { NodeController } from './node/node.controller';
import { NodeService } from './node/node.service';
import { WhaleService } from './whale/whale.service';
import { DeFiChainUtil } from './utils/defichain.util';

@Module({
  imports: [SharedModule],
  providers: [NodeService, WhaleService, DeFiChainUtil],
  exports: [NodeService, WhaleService, DeFiChainUtil],
  controllers: [NodeController],
})
export class AinModule {}
