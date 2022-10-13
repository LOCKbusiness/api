import { Module } from '@nestjs/common';
import { SharedModule } from 'src/shared/shared.module';
import { JellyfishService } from './jellyfish/jellyfish.service';
import { NodeController } from './node/node.controller';
import { NodeService } from './node/node.service';
import { WhaleService } from './whale/whale.service';

@Module({
  imports: [SharedModule],
  providers: [NodeService, WhaleService, JellyfishService],
  exports: [NodeService, WhaleService, JellyfishService],
  controllers: [NodeController],
})
export class AinModule {}
