import { Module } from '@nestjs/common';
import { AinModule } from './ain/ain.module';
import { CryptoService } from './shared/services/crypto.service';

@Module({
  imports: [AinModule],
  controllers: [],
  providers: [CryptoService],
  exports: [AinModule, CryptoService],
})
export class BlockchainModule {}
