import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AinModule } from './blockchain/ain/ain.module';
import { GetConfig } from './config/config';
import { SharedModule } from './shared/shared.module';

@Module({
  imports: [TypeOrmModule.forRoot(GetConfig().database), SharedModule, AinModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
