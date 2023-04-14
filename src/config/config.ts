import { Injectable, Optional } from '@nestjs/common';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { I18nOptions } from 'nestjs-i18n';
import { join } from 'path';
import { MailOptions } from 'src/integration/notification/services/mail.service';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { NetworkName } from '@defichain/jellyfish-network';

export enum Process {
  PAY_IN = 'PayIn',
  DEX = 'Dex',
  PAY_OUT = 'PayOut',
  STAKING_DEPOSIT = 'StakingDeposit',
  STAKING_WITHDRAWAL = 'StakingWithdrawal',
  STAKING_LIQUIDITY_MANAGEMENT = 'StakingLiquidityManagement',
  STAKING_REWARD_PAYOUT = 'StakingRewardPayout',
  MASTERNODE = 'Masternode',
  TRANSACTION = 'Transaction',
  ANALYTICS = 'Analytics',
  MONITORING = 'Monitoring',
  UTXO_MANAGEMENT = 'UtxoManagement',
  VAULT_MANAGEMENT = 'VaultManagement',
  PRICING = 'Pricing',
}

export function GetConfig(): Configuration {
  return new Configuration();
}

export class Configuration {
  environment = process.env.ENVIRONMENT;
  network = process.env.NETWORK as NetworkName;
  defaultLanguage = 'en';
  defaultTelegramUrl = 'https://t.me/LOCK_Staking';
  defaultTwitterUrl = 'https://twitter.com/Lock_Space_';
  defaultVolumeDecimal = 2;

  database: TypeOrmModuleOptions = {
    type: 'mssql',
    host: process.env.SQL_HOST,
    port: Number.parseInt(process.env.SQL_PORT),
    username: process.env.SQL_USERNAME,
    password: process.env.SQL_PASSWORD,
    database: process.env.SQL_DB,
    entities: ['dist/**/*.entity{.ts,.js}'],
    autoLoadEntities: true,
    synchronize: process.env.SQL_SYNCHRONIZE === 'true',
    migrationsRun: process.env.SQL_MIGRATE === 'true',
    migrations: ['migration/*.js'],
    connectionTimeout: 30000,
    requestTimeout: 30000,
  };

  i18n: I18nOptions = {
    fallbackLanguage: this.defaultLanguage,
    loaderOptions: {
      path: join(__dirname, '../shared/i18n/'),
      watch: true,
    },
    resolvers: [{ resolve: () => this.defaultLanguage }],
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
        dir: join(__dirname, '../shared/assets/mails'),
        adapter: new HandlebarsAdapter(),
        options: {
          strict: true,
        },
      },
    },
    defaultMailTemplate: 'default',
    contact: {
      supportMail: process.env.SUPPORT_MAIL || 'admin@lock.space',
      monitoringMail: process.env.MONITORING_MAIL || 'admin@lock.space',
    },
  };

  mydefichain = {
    username: process.env.MYDEFICHAIN_USER,
    password: process.env.MYDEFICHAIN_PASSWORD,
  };

  kyc = {
    secret: process.env.KYC_SECRET,
    phrase: process.env.KYC_PHRASE?.split(',') ?? [],
    allowedWebhookIps: process.env.KYC_WEBHOOK_IPS?.split(',') ?? [],
    apiUrl: process.env.KYC_API_URL,
    walletId: +process.env.KYC_WALLET_ID,
    frontendUrl: (kycHash: string) => `${process.env.KYC_FRONTEND_URL}?code=${kycHash}`,
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

  azure = {
    subscriptionId: process.env.AZURE_SUBSCRIPTION_ID,
    tenantId: process.env.AZURE_TENANT_ID,
    clientId: process.env.AZURE_CLIENT_ID,
    clientSecret: process.env.AZURE_CLIENT_SECRET,
  };

  blockchain = {
    minFeeRate: 0.00001,
    minFeeBuffer: 0.1,
    minDefiTxFeeBuffer: 0.00001,
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
        address: process.env.REW_STAKING_ADDRESS,
      },
      maxPrice: 1000000,
    },
  };

  whale = {
    version: 'v0',
    network: this.network,
    urls: process.env.OCEAN_URLS?.split(','),
  };

  payIn = {
    min: {
      DeFiChain: {
        coin: 0.0001,
        token: 0,
      },
    },
    forward: {
      phrase: process.env.FORWARD_PHRASE?.split(',') ?? [],
      accountToAccountFee: 0.00000297,
      accountToUtxoFee: 0.00000297,
      timeout: 300000, // 5 minutes
    },
  };

  staking = {
    minDeposits: [
      { amount: 1, asset: 'DFI' },
      { amount: 1, asset: 'USDC' },
      { amount: 1, asset: 'USDT' },
      { amount: 1, asset: 'EUROC' },
      { amount: 0.0001, asset: 'BTC' },
      { amount: 0.0001, asset: 'ETH' },
    ],
    defaultFee: 0,
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
      minChangePeriod: 900, // 15 minutes

      address: process.env.LIQUIDITY_ADDRESS,
      wallet: process.env.LIQUIDITY_WALLET_NAME,
      account: +process.env.LIQUIDITY_ACCOUNT_INDEX,
    },
    aprPeriod: 7, // days
  };

  yieldMachine = {
    liquidity: {
      address: process.env.YIELD_MACHINE_LIQUIDITY_ADDRESS,
      wallet: process.env.YIELD_MACHINE_LIQUIDITY_WALLET_NAME,
      account: +process.env.YIELD_MACHINE_LIQUIDITY_ACCOUNT_INDEX,
    },
  };

  utxo = {
    maxInputs: 300, // quantity of UTXOs
    minOperateValue: 100, // DFI
    minSplitValue: 20000, // DFI
    amount: {
      max: 300, // quantity of UTXOs
    },
    merge: 100, // UTXO
  };

  masternode = {
    collateral: 20000,
    fee: 10,
    creationFee: 0.00000232,
    resignFee: 0.00000297,
    voteFee: 0.00000297,
  };

  request = {
    knownIps: process.env.REQUEST_KNOWN_IPS?.split(',') ?? [],
    limitCheck: process.env.REQUEST_LIMIT_CHECK === 'true',
  };

  get addressFormat(): RegExp {
    return this.environment === 'prd'
      ? /^(8\w{33}|d\w{33}|d\w{41}|0x\w{40}|(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,39})$/
      : /^((7|8)\w{33}|(t|d)\w{33}|(t|d)\w{41}|0x\w{40}|(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,39})$/;
  }

  get signatureFormat(): RegExp {
    return /^(.{87}=|[a-f0-9]{130}|[a-f0-9x]{132})$/;
  }

  processDisabled = (processName: Process) =>
    process.env.DISABLED_PROCESSES === '*' || (process.env.DISABLED_PROCESSES?.split(',') ?? []).includes(processName);
}

@Injectable()
export class ConfigService {
  constructor(@Optional() readonly config?: Configuration) {
    Config = config ?? GetConfig();
  }
}

export let Config: Configuration;
