import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { HttpService } from './services/http.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './auth/jwt.strategy';
import { ScheduleModule } from '@nestjs/schedule';
import { GetConfig } from 'src/config/config';
import { ConfigModule } from 'src/config/config.module';
import { I18nModule } from 'nestjs-i18n';
import { AssetService } from './models/asset/asset.service';
import { AssetRepository } from './models/asset/asset.repository';
import { CryptoService } from 'src/blockchain/shared/services/crypto.service';
import { SettingService } from './services/setting.service';
import { SettingRepository } from './repositories/setting.repository';
import { ApiKeyStrategy } from './auth/api-key.strategy';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    TypeOrmModule.forFeature([SettingRepository, AssetRepository]),
    PassportModule.register({ defaultStrategy: 'jwt', session: true }),
    JwtModule.register(GetConfig().auth.jwt),
    I18nModule.forRoot(GetConfig().i18n),
    ScheduleModule.forRoot(),
  ],
  controllers: [],
  providers: [HttpService, JwtStrategy, ApiKeyStrategy, CryptoService, SettingService, AssetService],
  exports: [PassportModule, JwtModule, ScheduleModule, HttpService, CryptoService, SettingService, AssetService],
})
export class SharedModule {}
