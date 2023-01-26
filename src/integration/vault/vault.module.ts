import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SharedModule } from 'src/shared/shared.module';
import { VaultController } from './api/vault.controller';
import { VaultRepository } from './application/repositories/vault.repository';
import { VaultService } from './application/services/vault.service';
import { Vault } from './domain/entities/vault.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Vault]), SharedModule],
  controllers: [VaultController],
  providers: [VaultRepository, VaultService],
  exports: [VaultService],
})
export class VaultModule {}
