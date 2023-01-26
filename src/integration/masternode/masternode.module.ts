import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlockchainModule } from 'src/blockchain/blockchain.module';
import { SharedModule } from 'src/shared/shared.module';
import { MasternodeController } from './api/controllers/masternode.controller';
import { MasternodeRepository } from './application/repositories/masternode.repository';
import { MasternodeOwnerService } from './application/services/masternode-owner.service';
import { MasternodeService } from './application/services/masternode.service';
import { Masternode } from './domain/entities/masternode.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Masternode]), SharedModule, BlockchainModule],
  controllers: [MasternodeController],
  providers: [MasternodeRepository, MasternodeService, MasternodeOwnerService],
  exports: [MasternodeService, MasternodeOwnerService],
})
export class MasternodeModule {}
