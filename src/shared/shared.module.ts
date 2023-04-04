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
import { AssetService } from './services/asset.service';
import { AssetRepository } from './repositories/asset.repository';
import { SettingService } from './services/setting.service';
import { SettingRepository } from './repositories/setting.repository';
import { ApiKeyStrategy } from './auth/api-key.strategy';
import { Asset } from './entities/asset.entity';
import { RepositoryFactory } from './repositories/repository.factory';
import { AssetController } from './api/asset.controller';
import { IpLog } from './entities/ip-log.entity';
import { IpLogService } from './services/ip-log.service';
import { ThrottlerModule } from '@nestjs/throttler';
import { GeoLocationService } from 'src/subdomains/user/application/services/geo-location.service';
import { CountryService } from './services/country.service';
import { CountryRepository } from './repositories/country.repository';
import { IpLogRepository } from './repositories/ip-log.repository';
import { Setting } from './entities/setting.entity';
import { Country } from './entities/country.entity';
import { SettingController } from './api/setting.controller';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    TypeOrmModule.forFeature([Setting, Asset, Country, IpLog]),
    PassportModule.register({ defaultStrategy: 'jwt', session: true }),
    JwtModule.register(GetConfig().auth.jwt),
    I18nModule.forRoot(GetConfig().i18n),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot(),
  ],
  controllers: [AssetController, SettingController],
  providers: [
    RepositoryFactory,
    AssetRepository,
    SettingRepository,
    HttpService,
    JwtStrategy,
    ApiKeyStrategy,
    SettingService,
    AssetService,
    IpLogService,
    GeoLocationService,
    CountryService,
    CountryRepository,
    IpLogRepository,
  ],
  exports: [
    RepositoryFactory,
    PassportModule,
    JwtModule,
    ScheduleModule,
    HttpService,
    SettingService,
    AssetService,
    IpLogService,
    GeoLocationService,
    CountryService,
  ],
})
export class SharedModule {}
