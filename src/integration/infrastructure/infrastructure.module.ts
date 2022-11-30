import { Module } from '@nestjs/common';
import { SharedModule } from 'src/shared/shared.module';
import { AzureService } from './application/services/azure-service';

@Module({
  imports: [SharedModule],
  controllers: [],
  providers: [AzureService],
  exports: [AzureService],
})
export class InfrastructureModule {}
