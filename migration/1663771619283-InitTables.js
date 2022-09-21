const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class InitTables1663771619283 {
    name = 'InitTables1663771619283'

    async up(queryRunner) {
        await queryRunner.query(`CREATE TABLE "asset" ("id" int NOT NULL IDENTITY(1,1), "updated" datetime2 NOT NULL CONSTRAINT "DF_6ed5cbbccf21b8ef558f7ef2de5" DEFAULT getdate(), "created" datetime2 NOT NULL CONSTRAINT "DF_3ee68e53a3e33a8df283f66aada" DEFAULT getdate(), "name" nvarchar(256) NOT NULL, "category" nvarchar(256) NOT NULL CONSTRAINT "DF_834006608a30d1a762fa4618647" DEFAULT 'Stock', "dexName" nvarchar(256), "blockchain" nvarchar(256) NOT NULL CONSTRAINT "DF_0e1dda4bf7f110acc1b1988dc81" DEFAULT 'DeFiChain', CONSTRAINT "PK_1209d107fe21482beaea51b745e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "nameBlockchain" ON "asset" ("name", "blockchain") `);
        await queryRunner.query(`CREATE TABLE "setting" ("key" nvarchar(256) NOT NULL, "value" nvarchar(MAX) NOT NULL, CONSTRAINT "PK_1c4c95d773004250c157a744d6e" PRIMARY KEY ("key"))`);
        await queryRunner.query(`CREATE TABLE "masternode" ("id" int NOT NULL IDENTITY(1,1), "updated" datetime2 NOT NULL CONSTRAINT "DF_0b459b3d55720a6f1cb75e9ad8c" DEFAULT getdate(), "created" datetime2 NOT NULL CONSTRAINT "DF_0e8c92194bd6f9bbfd19a419d76" DEFAULT getdate(), "server" nvarchar(256) NOT NULL, "operator" nvarchar(256) NOT NULL, "owner" nvarchar(256), "ownerWallet" nvarchar(256), "timeLock" int, "creationDate" datetime2, "creationHash" nvarchar(256), "resignDate" datetime2, "resignHash" nvarchar(256), "signatureLiquidityManager" nvarchar(256), "signaturePayoutManager" nvarchar(256), "state" nvarchar(255) NOT NULL CONSTRAINT "DF_d7a54c03e4072a6854219a2061b" DEFAULT 'Idle', "creationFeePaid" bit NOT NULL CONSTRAINT "DF_d210454a6f762229d386c5d50be" DEFAULT 0, CONSTRAINT "UQ_a45f15af84b6da70e81d03f6bb0" UNIQUE ("operator"), CONSTRAINT "PK_80550f0c8b2ac59a059eb65a52a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_c1f5ae685b1f2b99f01e4f8f94" ON "masternode" ("owner") WHERE owner IS NOT NULL`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_6eda24f271411cb7de892b1d25" ON "masternode" ("creationHash") WHERE creationHash IS NOT NULL`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_fc4a620d663c5774ef9c6b91c8" ON "masternode" ("resignHash") WHERE resignHash IS NOT NULL`);
        await queryRunner.query(`CREATE TABLE "country" ("id" int NOT NULL IDENTITY(1,1), "updated" datetime2 NOT NULL CONSTRAINT "DF_77d13ee65ce17510d8a0eb04361" DEFAULT getdate(), "created" datetime2 NOT NULL CONSTRAINT "DF_0f2b6cb5923823466039624b8dc" DEFAULT getdate(), "symbol" nvarchar(10) NOT NULL, "name" nvarchar(256) NOT NULL, "enable" bit NOT NULL CONSTRAINT "DF_f788e9165cd7ce4404c53f3c661" DEFAULT 1, "ipEnable" bit NOT NULL CONSTRAINT "DF_055bfa32c7b317c2d310f9c227b" DEFAULT 1, CONSTRAINT "UQ_a311ea2c04056cbfb4de490d827" UNIQUE ("symbol"), CONSTRAINT "PK_bf6e37c231c4f4ea56dcd887269" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "ref" ("id" int NOT NULL IDENTITY(1,1), "updated" datetime2 NOT NULL CONSTRAINT "DF_91b5b877cb854489af9c6953bb1" DEFAULT getdate(), "created" datetime2 NOT NULL CONSTRAINT "DF_aaf9c56940a709f8d39e5f616b1" DEFAULT getdate(), "ip" nvarchar(256) NOT NULL, "ref" nvarchar(256), "origin" nvarchar(256), CONSTRAINT "UQ_ca2ec1ac9b89120336cdcb4cdcb" UNIQUE ("ip"), CONSTRAINT "PK_1869dabd26c52d6364ef6e3b1eb" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "wallet_provider" ("id" int NOT NULL IDENTITY(1,1), "updated" datetime2 NOT NULL CONSTRAINT "DF_8cb5099f91fbd28ae877b04aa74" DEFAULT getdate(), "created" datetime2 NOT NULL CONSTRAINT "DF_84c9dbd2dd0e662567cb7316479" DEFAULT getdate(), "name" nvarchar(256) NOT NULL, "minStakingKycStatus" nvarchar(256) NOT NULL CONSTRAINT "DF_4394cf5c6d4f991a838346eb27b" DEFAULT 'Light', CONSTRAINT "UQ_1e7a695e2f2ea4ca54df5f0fc72" UNIQUE ("name"), CONSTRAINT "PK_5c7933595d00e530f9d0eecca81" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "wallet" ("id" int NOT NULL IDENTITY(1,1), "updated" datetime2 NOT NULL CONSTRAINT "DF_fb09ba370efe59a077ccb666826" DEFAULT getdate(), "created" datetime2 NOT NULL CONSTRAINT "DF_2f026f6cfde1264d133a9da4a40" DEFAULT getdate(), "address" nvarchar(256) NOT NULL, "signature" nvarchar(256) NOT NULL, "ref" nvarchar(256) NOT NULL, "role" nvarchar(256) NOT NULL CONSTRAINT "DF_39dba1739ead1346b5eef893188" DEFAULT 'User', "ip" nvarchar(256) NOT NULL CONSTRAINT "DF_bbed434d5800c3ee55ebbd7bdb4" DEFAULT '0.0.0.0', "ipCountry" nvarchar(256), "walletProviderId" int, "userId" int NOT NULL, CONSTRAINT "UQ_1dcc9f5fd49e3dc52c6d2393c53" UNIQUE ("address"), CONSTRAINT "UQ_e8d3c4f5fa38ef3f16f21e7534f" UNIQUE ("ref"), CONSTRAINT "PK_bec464dd8d54c39c54fd32e2334" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "user" ("id" int NOT NULL IDENTITY(1,1), "updated" datetime2 NOT NULL CONSTRAINT "DF_5904a9d40152f354e4c7b0202fb" DEFAULT getdate(), "created" datetime2 NOT NULL CONSTRAINT "DF_8ce4c93ba419b56bd82e533724d" DEFAULT getdate(), "kycId" nvarchar(256), "mail" nvarchar(256), "firstName" nvarchar(256), "lastName" nvarchar(256), "street" nvarchar(256), "houseNumber" nvarchar(256), "city" nvarchar(256), "zip" nvarchar(256), "phone" nvarchar(256), "language" nvarchar(256), "kycStatus" nvarchar(256) NOT NULL CONSTRAINT "DF_fd8b11316c584a7f4b9c7a0af9f" DEFAULT 'NA', "kycHash" nvarchar(256), "countryId" int, CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "wallet" ADD CONSTRAINT "FK_5f9d93bd5c22ed5b4211b26718a" FOREIGN KEY ("walletProviderId") REFERENCES "wallet_provider"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "wallet" ADD CONSTRAINT "FK_35472b1fe48b6330cd349709564" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user" ADD CONSTRAINT "FK_4aaf6d02199282eb8d3931bff31" FOREIGN KEY ("countryId") REFERENCES "country"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "user" DROP CONSTRAINT "FK_4aaf6d02199282eb8d3931bff31"`);
        await queryRunner.query(`ALTER TABLE "wallet" DROP CONSTRAINT "FK_35472b1fe48b6330cd349709564"`);
        await queryRunner.query(`ALTER TABLE "wallet" DROP CONSTRAINT "FK_5f9d93bd5c22ed5b4211b26718a"`);
        await queryRunner.query(`DROP TABLE "user"`);
        await queryRunner.query(`DROP TABLE "wallet"`);
        await queryRunner.query(`DROP TABLE "wallet_provider"`);
        await queryRunner.query(`DROP TABLE "ref"`);
        await queryRunner.query(`DROP TABLE "country"`);
        await queryRunner.query(`DROP INDEX "IDX_fc4a620d663c5774ef9c6b91c8" ON "masternode"`);
        await queryRunner.query(`DROP INDEX "IDX_6eda24f271411cb7de892b1d25" ON "masternode"`);
        await queryRunner.query(`DROP INDEX "IDX_c1f5ae685b1f2b99f01e4f8f94" ON "masternode"`);
        await queryRunner.query(`DROP TABLE "masternode"`);
        await queryRunner.query(`DROP TABLE "setting"`);
        await queryRunner.query(`DROP INDEX "nameBlockchain" ON "asset"`);
        await queryRunner.query(`DROP TABLE "asset"`);
    }
}
