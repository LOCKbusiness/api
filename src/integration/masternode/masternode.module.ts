import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AinModule } from 'src/blockchain/ain/ain.module';
import { SharedModule } from 'src/shared/shared.module';
import { MasternodeController } from './api/controllers/masternode.controller';
import { MasternodeRepository } from './application/repositories/masternode.repository';
import { MasternodeOwnerService } from './application/services/masternode-owner.service';
import { MasternodeService } from './application/services/masternode.service';

@Module({
  imports: [TypeOrmModule.forFeature([MasternodeRepository]), SharedModule, AinModule],
  controllers: [MasternodeController],
  providers: [MasternodeService, MasternodeOwnerService],
  exports: [],
})
export class MasternodeModule {}
