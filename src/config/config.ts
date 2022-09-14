import { Injectable, Optional } from '@nestjs/common';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { I18nJsonParser, I18nOptions } from 'nestjs-i18n';
import * as path from 'path';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { MailOptions } from 'src/shared/services/mail.service';

export function GetConfig(): Configuration {
  return new Configuration();
}

export class Configuration {
  environment = process.env.ENVIRONMENT;
  network = process.env.NETWORK;
  githubToken = process.env.GH_TOKEN;
  defaultLanguage = 'en';
  defaultCountry = 'DE';
  defaultCurrency = 'EUR';
  defaultVolumeDecimal = 2;
  defaultPercentageDecimal = 2;

  colors = {};

  database: TypeOrmModuleOptions = {
    type: 'mssql',
    host: process.env.SQL_HOST,
    port: Number.parseInt(process.env.SQL_PORT),
    username: process.env.SQL_USERNAME,
    password: process.env.SQL_PASSWORD,
    database: process.env.SQL_DB,
    entities: ['dist/**/*.entity{.ts,.js}'],
    synchronize: process.env.SQL_SYNCHRONIZE === 'true',
    migrationsRun: process.env.SQL_MIGRATE === 'true',
    migrations: ['migration/*.js'],
    cli: {
      migrationsDir: 'migration',
    },
    connectionTimeout: 30000,
    requestTimeout: 30000,
  };

  i18n: I18nOptions = {
    fallbackLanguage: this.defaultLanguage,
    parser: I18nJsonParser,
    parserOptions: {
      path: path.join(__dirname, '../shared/i18n/'),
      watch: true,
    },
  };

  mydefichain = {
    username: process.env.MYDEFICHAIN_USER,
    password: process.env.MYDEFICHAIN_PASSWORD,
  };

  auth = {
    jwt: {
      secret: process.env.JWT_SECRET,
      signOptions: {
        expiresIn: process.env.JWT_EXPIRES_IN ?? 172800,
      },
    },
  };

  blockchain = {
    default: {
      user: process.env.NODE_USER,
      password: process.env.NODE_PASSWORD,
      walletPassword: process.env.NODE_WALLET_PASSWORD,
      inp: {
        active: process.env.NODE_INP_URL_ACTIVE,
        passive: process.env.NODE_INP_URL_PASSIVE,
      },
      rew: {
        active: process.env.NODE_REW_URL_ACTIVE,
        passive: process.env.NODE_REW_URL_PASSIVE,
      },
    },
  };

  mail: MailOptions = {
    options: {
      transport: {
        host: 'gateway.lock.space',
        secure: true,
        port: 465,
        auth: {
          user: process.env.MAIL_USER,
          pass: process.env.MAIL_PASS,
        },
        tls: {
          rejectUnauthorized: false,
        },
      },
      template: {
        dir: path.join(__dirname, '../shared/assets/mails'),
        adapter: new HandlebarsAdapter(),
        options: {
          strict: true,
        },
      },
    },
    defaultMailTemplate: 'personal',
    contact: {
      supportMail: process.env.SUPPORT_MAIL || 'support@lock.space',
      monitoringMail: process.env.MONITORING_MAIL || 'monitoring@lock.space',
      noReplyMail: process.env.NOREPLY_MAIL || 'noreply@lock.space',
    },
  };

  whale = {
    version: 'v0',
    network: this.network,
    url: 'https://ocean.defichain.com',
  };
}

@Injectable()
export class ConfigService {
  constructor(@Optional() readonly config?: Configuration) {
    Config = config ?? GetConfig();
  }
}

export let Config: Configuration;
