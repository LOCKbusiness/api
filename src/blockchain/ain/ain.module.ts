import { Module } from '@nestjs/common';
import { SharedModule } from 'src/shared/shared.module';
import { NodeController } from './node/node.controller';
import { NodeService } from './node/node.service';
import { WhaleService } from './whale/whale.service';

@Module({
  imports: [SharedModule],
  providers: [NodeService, WhaleService],
  exports: [NodeService, WhaleService],
  controllers: [NodeController],
})
export class AinModule {}
