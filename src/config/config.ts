import { Injectable, Optional } from '@nestjs/common';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { I18nJsonParser, I18nOptions } from 'nestjs-i18n';
import * as path from 'path';

export function GetConfig(): Configuration {
  return new Configuration();
}

export class Configuration {
  environment = process.env.ENVIRONMENT;
  network = process.env.NETWORK;
  defaultLanguage = 'en';

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

  kyc = {
    secret: process.env.KYC_SECRET,
    phrase: process.env.KYC_PHRASE?.split(','),
    allowedWebhookIps: process.env.KYC_WEBHOOK_IPS?.split(','),
    apiUrl: process.env.KYC_API_URL,
    frontendUrl: process.env.KYC_FRONTEND_URL,
  };

  auth = {
    jwt: {
      secret: process.env.JWT_SECRET,
      signOptions: {
        expiresIn: process.env.JWT_EXPIRES_IN ?? 172800,
      },
    },
    signMessage:
      'By_signing_this_message,_you_confirm_to_LOCK_that_you_are_the_sole_owner_of_the_provided_Blockchain_address._Your_ID:_',
  };

  blockchain = {
    minFeeRate: 0.00001,
    minFeeBuffer: 0.0001,
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

  whale = {
    version: 'v0',
    network: this.network,
    url: 'https://ocean.defichain.com',
  };

  payIn = {
    minPayIn: {
      Fiat: {
        USD: 1,
      },
      Bitcoin: {
        BTC: 0.0005,
      },
      DeFiChain: {
        DFI: 0.01,
        USD: 1,
      },
    },
  };

  staking = {
    minimalStake: 1,
    minimalDeposit: 0.01,
    stakingFee: 0.05,
    signatureTemplates: {
      signWithdrawalMessage:
        'Withdraw_${amount}_${asset}_from_${address}_staking_id_${stakingId}_withdrawal_id_${withdrawalId}',
    },

    timeout: {
      signature: 300000, // 5 minutes
      utxo: 360000, // 6 minutes
    },

    signature: {
      address: process.env.API_SIGN_ADDRESS,
    },

    liquidity: {
      min: 20000,
      max: 40000,

      address: process.env.LIQUIDITY_ADDRESS,
      wallet: process.env.LIQUIDITY_WALLET_NAME,
      account: process.env.LIQUIDITY_ACCOUNT_INDEX,
    },
    aprPeriod: 28, // days
  };

  utxo = {
    maxInputs: 300,
    minOperateValue: 100,
    amount: {
      min: 100,
      max: 300,
    },
    split: 10,
    merge: 100,
  };

  priceProviders = {
    coinGecko: {
      baseUrl: 'https://api.coingecko.com/api/v3',
    },
  };

  masternode = {
    collateral: 20000,
    fee: 10,
    creationFee: 0.00000232,
    resignFee: 0.00000209,
  };

  get addressFormat(): RegExp {
    return this.environment === 'prd'
      ? /^(8\w{33}|d\w{33}|d\w{41}|0x\w{40}|(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,39})$/
      : /^((7|8)\w{33}|(t|d)\w{33}|(t|d)\w{41}|0x\w{40}|(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,39})$/;
  }

  get signatureFormat(): RegExp {
    return /^(.{87}=|[a-f0-9]{130}|[a-f0-9x]{132})$/;
  }
}

@Injectable()
export class ConfigService {
  constructor(@Optional() readonly config?: Configuration) {
    Config = config ?? GetConfig();
  }
}

export let Config: Configuration;
