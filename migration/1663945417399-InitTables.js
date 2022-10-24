const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class InitTables1663945417399 {
    name = 'InitTables1663945417399'

    async up(queryRunner) {
        await queryRunner.query(`CREATE TABLE "masternode" ("id" int NOT NULL IDENTITY(1,1), "updated" datetime2 NOT NULL CONSTRAINT "DF_0b459b3d55720a6f1cb75e9ad8c" DEFAULT getdate(), "created" datetime2 NOT NULL CONSTRAINT "DF_0e8c92194bd6f9bbfd19a419d76" DEFAULT getdate(), "server" nvarchar(255) NOT NULL, "operator" nvarchar(255) NOT NULL, "owner" nvarchar(255), "ownerWallet" nvarchar(255), "timeLock" int, "creationDate" datetime2, "creationHash" nvarchar(255), "resignDate" datetime2, "resignHash" nvarchar(255), "signatureLiquidityManager" nvarchar(255), "signaturePayoutManager" nvarchar(255), "state" nvarchar(255) NOT NULL CONSTRAINT "DF_d7a54c03e4072a6854219a2061b" DEFAULT 'Idle', "creationFeePaid" bit NOT NULL CONSTRAINT "DF_d210454a6f762229d386c5d50be" DEFAULT 0, CONSTRAINT "UQ_a45f15af84b6da70e81d03f6bb0" UNIQUE ("operator"), CONSTRAINT "PK_80550f0c8b2ac59a059eb65a52a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_c1f5ae685b1f2b99f01e4f8f94" ON "masternode" ("owner") WHERE owner IS NOT NULL`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_6eda24f271411cb7de892b1d25" ON "masternode" ("creationHash") WHERE creationHash IS NOT NULL`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_fc4a620d663c5774ef9c6b91c8" ON "masternode" ("resignHash") WHERE resignHash IS NOT NULL`);
        await queryRunner.query(`CREATE TABLE "asset" ("id" int NOT NULL IDENTITY(1,1), "updated" datetime2 NOT NULL CONSTRAINT "DF_6ed5cbbccf21b8ef558f7ef2de5" DEFAULT getdate(), "created" datetime2 NOT NULL CONSTRAINT "DF_3ee68e53a3e33a8df283f66aada" DEFAULT getdate(), "name" nvarchar(255) NOT NULL, "displayName" nvarchar(255) NOT NULL, "category" nvarchar(255) NOT NULL CONSTRAINT "DF_834006608a30d1a762fa4618647" DEFAULT 'Stock', "blockchain" nvarchar(255) NOT NULL CONSTRAINT "DF_0e1dda4bf7f110acc1b1988dc81" DEFAULT 'DeFiChain', CONSTRAINT "PK_1209d107fe21482beaea51b745e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "nameBlockchain" ON "asset" ("name", "blockchain") `);
        await queryRunner.query(`CREATE TABLE "setting" ("key" nvarchar(255) NOT NULL, "value" nvarchar(MAX) NOT NULL, CONSTRAINT "PK_1c4c95d773004250c157a744d6e" PRIMARY KEY ("key"))`);
        await queryRunner.query(`CREATE TABLE "pay_in_blockchain_address" ("id" int NOT NULL IDENTITY(1,1), "updated" datetime2 NOT NULL CONSTRAINT "DF_d096a06995e164bb65d7b86c3d4" DEFAULT getdate(), "created" datetime2 NOT NULL CONSTRAINT "DF_d1de387b5482afbe63fd376846b" DEFAULT getdate(), "address" nvarchar(255) NOT NULL, "blockchain" nvarchar(255) NOT NULL, CONSTRAINT "PK_cc4c69a071db8dd31927860a066" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "pay_in" ("id" int NOT NULL IDENTITY(1,1), "updated" datetime2 NOT NULL CONSTRAINT "DF_fe53dc126f8c3eece299770227c" DEFAULT getdate(), "created" datetime2 NOT NULL CONSTRAINT "DF_27bd47f8161d209af31b0098b0d" DEFAULT getdate(), "status" nvarchar(255) NOT NULL, "txId" nvarchar(255) NOT NULL, "txType" nvarchar(255) NOT NULL, "returnTxId" nvarchar(255), "blockHeight" int NOT NULL, "amount" float NOT NULL, "purpose" nvarchar(255) NOT NULL, "assetId" int NOT NULL, CONSTRAINT "PK_ebeef74046fb2e96f21692b8f2d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "reward" ("id" int NOT NULL IDENTITY(1,1), "updated" datetime2 NOT NULL CONSTRAINT "DF_5dcc411f8ece765af5be808b2ca" DEFAULT getdate(), "created" datetime2 NOT NULL CONSTRAINT "DF_4328867969d9b6b3027d7f8a3d9" DEFAULT getdate(), "status" nvarchar(255) NOT NULL, "amount" float NOT NULL CONSTRAINT "DF_903071fa6f845566a03224c6555" DEFAULT 0, "reinvestTxId" nvarchar(255), "reinvestOutputDate" datetime, "fee" float NOT NULL CONSTRAINT "DF_bee3de89dbf732f919cbc184b5e" DEFAULT 0, "amountEur" float NOT NULL CONSTRAINT "DF_76cf787f50e38c5eab4257e9b67" DEFAULT 0, "amountUsd" float NOT NULL CONSTRAINT "DF_8bd5881c626339c3f7cee209dca" DEFAULT 0, "amountChf" float NOT NULL CONSTRAINT "DF_c8be21ce6f3ee72bea17d473055" DEFAULT 0, "stakingId" int, "assetId" int NOT NULL, CONSTRAINT "PK_a90ea606c229e380fb341838036" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "withdrawal" ("id" int NOT NULL IDENTITY(1,1), "updated" datetime2 NOT NULL CONSTRAINT "DF_2891485bf909d1a87563b714ce4" DEFAULT getdate(), "created" datetime2 NOT NULL CONSTRAINT "DF_a1933b80e415b15b04c97171fac" DEFAULT getdate(), "signature" nvarchar(255) NOT NULL, "status" nvarchar(255) NOT NULL, "amount" float NOT NULL CONSTRAINT "DF_2d3971b7ca757ba8f291ee763bd" DEFAULT 0, "outputDate" datetime2, "prepareTxId" nvarchar(255), "withdrawalTxId" nvarchar(255), "stakingId" int, "assetId" int NOT NULL, CONSTRAINT "PK_840e247aaad3fbd4e18129122a2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "staking_blockchain_address" ("id" int NOT NULL IDENTITY(1,1), "updated" datetime2 NOT NULL CONSTRAINT "DF_d353923225b5700b20bfc648b24" DEFAULT getdate(), "created" datetime2 NOT NULL CONSTRAINT "DF_d2c138ad4c47ca823b3190cc699" DEFAULT getdate(), "address" nvarchar(255) NOT NULL, "blockchain" nvarchar(255) NOT NULL, CONSTRAINT "PK_ba3043c3028b17559e58b57c4ad" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "wallet_blockchain_address" ("id" int NOT NULL IDENTITY(1,1), "updated" datetime2 NOT NULL CONSTRAINT "DF_2c8c27e2188bd2718a12e1e9cb3" DEFAULT getdate(), "created" datetime2 NOT NULL CONSTRAINT "DF_cc22c239e6ca93511a98b251d36" DEFAULT getdate(), "address" nvarchar(255) NOT NULL, "blockchain" nvarchar(255) NOT NULL, CONSTRAINT "PK_a160e53978021a0b3daa9a9b814" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "staking" ("id" int NOT NULL IDENTITY(1,1), "updated" datetime2 NOT NULL CONSTRAINT "DF_1470e377919ac832cf2526a73fa" DEFAULT getdate(), "created" datetime2 NOT NULL CONSTRAINT "DF_7e9a12cfd5585c317fe3f715f54" DEFAULT getdate(), "userId" int NOT NULL, "status" nvarchar(255) NOT NULL, "balance" float NOT NULL CONSTRAINT "DF_73123fbb52548e2f205c1739f22" DEFAULT 0, "rewardsAmount" float NOT NULL CONSTRAINT "DF_5303085f041dfec8d40b464a532" DEFAULT 0, "fee" float NOT NULL CONSTRAINT "DF_59602c4a1c29c878da3d2673a6e" DEFAULT 0.05, "assetId" int NOT NULL, "depositAddressId" int NOT NULL, "withdrawalAddressId" int NOT NULL, "rewardsPayoutAddressId" int NOT NULL, CONSTRAINT "PK_37377c2d716ef7341fd21d76e78" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "REL_fc6daf1ef14aec38b2ea6b255d" ON "staking" ("depositAddressId") WHERE "depositAddressId" IS NOT NULL`);
        await queryRunner.query(`CREATE TABLE "deposit" ("id" int NOT NULL IDENTITY(1,1), "updated" datetime2 NOT NULL CONSTRAINT "DF_41566fb04581e65059c3d3da6e6" DEFAULT getdate(), "created" datetime2 NOT NULL CONSTRAINT "DF_324a41f9087b363db6b8505c85b" DEFAULT getdate(), "status" nvarchar(255) NOT NULL, "amount" float NOT NULL CONSTRAINT "DF_d6e2037f153b6c648ba13e94ffe" DEFAULT 0, "payInTxId" nvarchar(255), "forwardTxId" nvarchar(255), "stakingId" int, "assetId" int NOT NULL, CONSTRAINT "PK_6654b4be449dadfd9d03a324b61" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "country" ("id" int NOT NULL IDENTITY(1,1), "updated" datetime2 NOT NULL CONSTRAINT "DF_77d13ee65ce17510d8a0eb04361" DEFAULT getdate(), "created" datetime2 NOT NULL CONSTRAINT "DF_0f2b6cb5923823466039624b8dc" DEFAULT getdate(), "symbol" nvarchar(10) NOT NULL, "name" nvarchar(255) NOT NULL, "enable" bit NOT NULL CONSTRAINT "DF_f788e9165cd7ce4404c53f3c661" DEFAULT 1, "ipEnable" bit NOT NULL CONSTRAINT "DF_055bfa32c7b317c2d310f9c227b" DEFAULT 1, CONSTRAINT "UQ_a311ea2c04056cbfb4de490d827" UNIQUE ("symbol"), CONSTRAINT "PK_bf6e37c231c4f4ea56dcd887269" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "ref" ("id" int NOT NULL IDENTITY(1,1), "updated" datetime2 NOT NULL CONSTRAINT "DF_91b5b877cb854489af9c6953bb1" DEFAULT getdate(), "created" datetime2 NOT NULL CONSTRAINT "DF_aaf9c56940a709f8d39e5f616b1" DEFAULT getdate(), "ip" nvarchar(255) NOT NULL, "ref" nvarchar(255), "origin" nvarchar(255), CONSTRAINT "UQ_ca2ec1ac9b89120336cdcb4cdcb" UNIQUE ("ip"), CONSTRAINT "PK_1869dabd26c52d6364ef6e3b1eb" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "wallet_provider" ("id" int NOT NULL IDENTITY(1,1), "updated" datetime2 NOT NULL CONSTRAINT "DF_8cb5099f91fbd28ae877b04aa74" DEFAULT getdate(), "created" datetime2 NOT NULL CONSTRAINT "DF_84c9dbd2dd0e662567cb7316479" DEFAULT getdate(), "name" nvarchar(255) NOT NULL, "minStakingKycStatus" nvarchar(255) NOT NULL CONSTRAINT "DF_4394cf5c6d4f991a838346eb27b" DEFAULT 'Light', CONSTRAINT "UQ_1e7a695e2f2ea4ca54df5f0fc72" UNIQUE ("name"), CONSTRAINT "PK_5c7933595d00e530f9d0eecca81" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "wallet" ("id" int NOT NULL IDENTITY(1,1), "updated" datetime2 NOT NULL CONSTRAINT "DF_fb09ba370efe59a077ccb666826" DEFAULT getdate(), "created" datetime2 NOT NULL CONSTRAINT "DF_2f026f6cfde1264d133a9da4a40" DEFAULT getdate(), "signature" nvarchar(255) NOT NULL, "ref" nvarchar(255) NOT NULL, "role" nvarchar(255) NOT NULL CONSTRAINT "DF_39dba1739ead1346b5eef893188" DEFAULT 'User', "ip" nvarchar(255) NOT NULL CONSTRAINT "DF_bbed434d5800c3ee55ebbd7bdb4" DEFAULT '0.0.0.0', "ipCountry" nvarchar(255), "addressId" int NOT NULL, "walletProviderId" int, "userId" int NOT NULL, CONSTRAINT "UQ_e8d3c4f5fa38ef3f16f21e7534f" UNIQUE ("ref"), CONSTRAINT "PK_bec464dd8d54c39c54fd32e2334" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "REL_088b89ec2a02c3b4482f3ac9af" ON "wallet" ("addressId") WHERE "addressId" IS NOT NULL`);
        await queryRunner.query(`CREATE TABLE "user" ("id" int NOT NULL IDENTITY(1,1), "updated" datetime2 NOT NULL CONSTRAINT "DF_5904a9d40152f354e4c7b0202fb" DEFAULT getdate(), "created" datetime2 NOT NULL CONSTRAINT "DF_8ce4c93ba419b56bd82e533724d" DEFAULT getdate(), "kycId" nvarchar(255), "mail" nvarchar(255), "firstName" nvarchar(255), "lastName" nvarchar(255), "street" nvarchar(255), "houseNumber" nvarchar(255), "city" nvarchar(255), "zip" nvarchar(255), "phone" nvarchar(255), "language" nvarchar(255), "kycStatus" nvarchar(255) NOT NULL CONSTRAINT "DF_fd8b11316c584a7f4b9c7a0af9f" DEFAULT 'NA', "kycHash" nvarchar(255), "countryId" int, CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "pay_in" ADD CONSTRAINT "FK_f009ccbd8a687c981f33f94f07c" FOREIGN KEY ("assetId") REFERENCES "asset"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reward" ADD CONSTRAINT "FK_ebe7d8dc5761f78280d6498daf8" FOREIGN KEY ("stakingId") REFERENCES "staking"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reward" ADD CONSTRAINT "FK_a2fb1646b57d3986fa6d97d0429" FOREIGN KEY ("assetId") REFERENCES "asset"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "withdrawal" ADD CONSTRAINT "FK_3e672e3a9ef3c732ddc89598d80" FOREIGN KEY ("stakingId") REFERENCES "staking"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "withdrawal" ADD CONSTRAINT "FK_52db5166e073226f38e8573724e" FOREIGN KEY ("assetId") REFERENCES "asset"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "staking" ADD CONSTRAINT "FK_9d5dbacb7704b48178b2953cd8f" FOREIGN KEY ("assetId") REFERENCES "asset"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "staking" ADD CONSTRAINT "FK_fc6daf1ef14aec38b2ea6b255dc" FOREIGN KEY ("depositAddressId") REFERENCES "staking_blockchain_address"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "staking" ADD CONSTRAINT "FK_50625d70cdee34360977267127f" FOREIGN KEY ("withdrawalAddressId") REFERENCES "wallet_blockchain_address"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "staking" ADD CONSTRAINT "FK_c9d49e5d1625ce208e33846b2b6" FOREIGN KEY ("rewardsPayoutAddressId") REFERENCES "wallet_blockchain_address"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "deposit" ADD CONSTRAINT "FK_6fa6fe8124a2feb05f7ec12f770" FOREIGN KEY ("stakingId") REFERENCES "staking"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "deposit" ADD CONSTRAINT "FK_b097a9ecd64c17199a4a8158121" FOREIGN KEY ("assetId") REFERENCES "asset"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "wallet" ADD CONSTRAINT "FK_088b89ec2a02c3b4482f3ac9af3" FOREIGN KEY ("addressId") REFERENCES "wallet_blockchain_address"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "wallet" ADD CONSTRAINT "FK_5f9d93bd5c22ed5b4211b26718a" FOREIGN KEY ("walletProviderId") REFERENCES "wallet_provider"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "wallet" ADD CONSTRAINT "FK_35472b1fe48b6330cd349709564" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user" ADD CONSTRAINT "FK_4aaf6d02199282eb8d3931bff31" FOREIGN KEY ("countryId") REFERENCES "country"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "user" DROP CONSTRAINT "FK_4aaf6d02199282eb8d3931bff31"`);
        await queryRunner.query(`ALTER TABLE "wallet" DROP CONSTRAINT "FK_35472b1fe48b6330cd349709564"`);
        await queryRunner.query(`ALTER TABLE "wallet" DROP CONSTRAINT "FK_5f9d93bd5c22ed5b4211b26718a"`);
        await queryRunner.query(`ALTER TABLE "wallet" DROP CONSTRAINT "FK_088b89ec2a02c3b4482f3ac9af3"`);
        await queryRunner.query(`ALTER TABLE "deposit" DROP CONSTRAINT "FK_b097a9ecd64c17199a4a8158121"`);
        await queryRunner.query(`ALTER TABLE "deposit" DROP CONSTRAINT "FK_6fa6fe8124a2feb05f7ec12f770"`);
        await queryRunner.query(`ALTER TABLE "staking" DROP CONSTRAINT "FK_c9d49e5d1625ce208e33846b2b6"`);
        await queryRunner.query(`ALTER TABLE "staking" DROP CONSTRAINT "FK_50625d70cdee34360977267127f"`);
        await queryRunner.query(`ALTER TABLE "staking" DROP CONSTRAINT "FK_fc6daf1ef14aec38b2ea6b255dc"`);
        await queryRunner.query(`ALTER TABLE "staking" DROP CONSTRAINT "FK_9d5dbacb7704b48178b2953cd8f"`);
        await queryRunner.query(`ALTER TABLE "withdrawal" DROP CONSTRAINT "FK_52db5166e073226f38e8573724e"`);
        await queryRunner.query(`ALTER TABLE "withdrawal" DROP CONSTRAINT "FK_3e672e3a9ef3c732ddc89598d80"`);
        await queryRunner.query(`ALTER TABLE "reward" DROP CONSTRAINT "FK_a2fb1646b57d3986fa6d97d0429"`);
        await queryRunner.query(`ALTER TABLE "reward" DROP CONSTRAINT "FK_ebe7d8dc5761f78280d6498daf8"`);
        await queryRunner.query(`ALTER TABLE "pay_in" DROP CONSTRAINT "FK_f009ccbd8a687c981f33f94f07c"`);
        await queryRunner.query(`DROP TABLE "user"`);
        await queryRunner.query(`DROP INDEX "REL_088b89ec2a02c3b4482f3ac9af" ON "wallet"`);
        await queryRunner.query(`DROP TABLE "wallet"`);
        await queryRunner.query(`DROP TABLE "wallet_provider"`);
        await queryRunner.query(`DROP TABLE "ref"`);
        await queryRunner.query(`DROP TABLE "country"`);
        await queryRunner.query(`DROP TABLE "deposit"`);
        await queryRunner.query(`DROP INDEX "REL_fc6daf1ef14aec38b2ea6b255d" ON "staking"`);
        await queryRunner.query(`DROP TABLE "staking"`);
        await queryRunner.query(`DROP TABLE "wallet_blockchain_address"`);
        await queryRunner.query(`DROP TABLE "staking_blockchain_address"`);
        await queryRunner.query(`DROP TABLE "withdrawal"`);
        await queryRunner.query(`DROP TABLE "reward"`);
        await queryRunner.query(`DROP TABLE "pay_in"`);
        await queryRunner.query(`DROP TABLE "pay_in_blockchain_address"`);
        await queryRunner.query(`DROP TABLE "setting"`);
        await queryRunner.query(`DROP INDEX "nameBlockchain" ON "asset"`);
        await queryRunner.query(`DROP TABLE "asset"`);
        await queryRunner.query(`DROP INDEX "IDX_fc4a620d663c5774ef9c6b91c8" ON "masternode"`);
        await queryRunner.query(`DROP INDEX "IDX_6eda24f271411cb7de892b1d25" ON "masternode"`);
        await queryRunner.query(`DROP INDEX "IDX_c1f5ae685b1f2b99f01e4f8f94" ON "masternode"`);
        await queryRunner.query(`DROP TABLE "masternode"`);
    }
}
