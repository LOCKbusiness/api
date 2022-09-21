import { Module } from '@nestjs/common';
import { AinModule } from './ain/ain.module';
import { CryptoService } from './shared/services/crypto.service';

@Module({
  imports: [AinModule],
  providers: [CryptoService],
  exports: [AinModule, CryptoService],
  controllers: [],
})
export class BlockchainModule {}
