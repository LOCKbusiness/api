const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class rewardsPayout1669638666343 {
    name = 'rewardsPayout1669638666343'

    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "reward" DROP CONSTRAINT "FK_a2fb1646b57d3986fa6d97d0429"`);
        await queryRunner.query(`CREATE TABLE "liquidity_order" ("id" int NOT NULL IDENTITY(1,1), "updated" datetime2 NOT NULL CONSTRAINT "DF_2d6c7dd38f16a6639f1cc1055b1" DEFAULT getdate(), "created" datetime2 NOT NULL CONSTRAINT "DF_94004684697b3e7fa669db48d61" DEFAULT getdate(), "type" nvarchar(256) NOT NULL, "context" nvarchar(256) NOT NULL, "correlationId" nvarchar(256) NOT NULL, "chain" nvarchar(256) NOT NULL, "referenceAmount" float NOT NULL, "targetAmount" float, "isReady" bit NOT NULL CONSTRAINT "DF_95177a5e9e0bbabd4fc518ae4aa" DEFAULT 0, "isComplete" bit NOT NULL CONSTRAINT "DF_86b8a58b1cf8411d757e33fb1bd" DEFAULT 0, "swapAmount" float, "strategy" nvarchar(256), "txId" nvarchar(256), "purchasedAmount" float, "feeAmount" float, "referenceAssetId" int, "targetAssetId" int, "swapAssetId" int, "feeAssetId" int, CONSTRAINT "PK_ea07253c1548457d31400c38459" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "payout_order" ("id" int NOT NULL IDENTITY(1,1), "updated" datetime2 NOT NULL CONSTRAINT "DF_c962900745f742c3bfb79eb3772" DEFAULT getdate(), "created" datetime2 NOT NULL CONSTRAINT "DF_77e65c6e94f256d8d4a21592269" DEFAULT getdate(), "context" nvarchar(256) NOT NULL, "correlationId" nvarchar(256) NOT NULL, "chain" nvarchar(256) NOT NULL, "amount" float NOT NULL, "destinationAddress" nvarchar(256) NOT NULL, "status" nvarchar(256) NOT NULL, "transferTxId" nvarchar(256), "payoutTxId" nvarchar(256), "preparationFeeAmount" float, "payoutFeeAmount" float, "assetId" int, "preparationFeeAssetId" int, "payoutFeeAssetId" int, CONSTRAINT "PK_b8871a008d488ac0065baff70f8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "reward_batch" ("id" int NOT NULL IDENTITY(1,1), "updated" datetime2 NOT NULL CONSTRAINT "DF_f576fc7953d18a5bf66db4a346c" DEFAULT getdate(), "created" datetime2 NOT NULL CONSTRAINT "DF_bdf982e1b6f0f934e455d9524e2" DEFAULT getdate(), "outputReferenceAmount" float, "targetAmount" float, "status" nvarchar(256), "blockchain" nvarchar(256), "outputReferenceAssetId" int, "targetAssetId" int, CONSTRAINT "PK_4235dd892f8137b769baf02f203" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "staking_analytics" DROP COLUMN "operatorCount"`);
        await queryRunner.query(`ALTER TABLE "staking_analytics" DROP COLUMN "tvl"`);
        await queryRunner.query(`ALTER TABLE "reward" DROP CONSTRAINT "DF_903071fa6f845566a03224c6555"`);
        await queryRunner.query(`ALTER TABLE "reward" DROP COLUMN "amount"`);
        await queryRunner.query(`ALTER TABLE "reward" DROP COLUMN "reinvestTxId"`);
        await queryRunner.query(`ALTER TABLE "reward" DROP COLUMN "reinvestOutputDate"`);
        await queryRunner.query(`ALTER TABLE "reward" DROP CONSTRAINT "DF_bee3de89dbf732f919cbc184b5e"`);
        await queryRunner.query(`ALTER TABLE "reward" DROP COLUMN "fee"`);
        await queryRunner.query(`ALTER TABLE "reward" DROP COLUMN "assetId"`);
        await queryRunner.query(`ALTER TABLE "reward" ADD "inputReferenceAmount" float NOT NULL CONSTRAINT "DF_fe478d1da983dbe39737e9104a1" DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE "reward" ADD "outputReferenceAmount" float NOT NULL CONSTRAINT "DF_f32f6405e6d248c9689959d7fe1" DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE "reward" ADD "feePercent" float NOT NULL CONSTRAINT "DF_40ceee0f23d664ef1850a78f083" DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE "reward" ADD "feeAmount" float NOT NULL CONSTRAINT "DF_dd31fd6727f40b48f38e228d544" DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE "reward" ADD "targetAddress" nvarchar(255)`);
        await queryRunner.query(`ALTER TABLE "reward" ADD "targetAmount" float`);
        await queryRunner.query(`ALTER TABLE "reward" ADD "txId" nvarchar(255)`);
        await queryRunner.query(`ALTER TABLE "reward" ADD "outputDate" datetime`);
        await queryRunner.query(`ALTER TABLE "reward" ADD "isReinvest" bit`);
        await queryRunner.query(`ALTER TABLE "reward" ADD "batchId" int`);
        await queryRunner.query(`ALTER TABLE "reward" ADD "referenceAssetId" int NOT NULL`);
        await queryRunner.query(`ALTER TABLE "reward" ADD "targetAssetId" int NOT NULL`);
        await queryRunner.query(`ALTER TABLE "reward" ALTER COLUMN "amountEur" float`);
        await queryRunner.query(`ALTER TABLE "reward" DROP CONSTRAINT "DF_76cf787f50e38c5eab4257e9b67"`);
        await queryRunner.query(`ALTER TABLE "reward" ALTER COLUMN "amountUsd" float`);
        await queryRunner.query(`ALTER TABLE "reward" DROP CONSTRAINT "DF_8bd5881c626339c3f7cee209dca"`);
        await queryRunner.query(`ALTER TABLE "reward" ALTER COLUMN "amountChf" float`);
        await queryRunner.query(`ALTER TABLE "reward" DROP CONSTRAINT "DF_c8be21ce6f3ee72bea17d473055"`);
        await queryRunner.query(`ALTER TABLE "liquidity_order" ADD CONSTRAINT "FK_5499b5d0a7e01d2433c6f6c97aa" FOREIGN KEY ("referenceAssetId") REFERENCES "asset"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "liquidity_order" ADD CONSTRAINT "FK_1e75a3f4817c922d85cf3e9be16" FOREIGN KEY ("targetAssetId") REFERENCES "asset"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "liquidity_order" ADD CONSTRAINT "FK_1a898d3850e8a95e1b7bede19c6" FOREIGN KEY ("swapAssetId") REFERENCES "asset"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "liquidity_order" ADD CONSTRAINT "FK_8c116f65742249f450313610c2b" FOREIGN KEY ("feeAssetId") REFERENCES "asset"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payout_order" ADD CONSTRAINT "FK_104e583561878b016c275c3c6b3" FOREIGN KEY ("assetId") REFERENCES "asset"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payout_order" ADD CONSTRAINT "FK_2b1d9ab3f1d324ba5e2cc42be4e" FOREIGN KEY ("preparationFeeAssetId") REFERENCES "asset"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payout_order" ADD CONSTRAINT "FK_326829b48a410c35065d7f989a9" FOREIGN KEY ("payoutFeeAssetId") REFERENCES "asset"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reward_batch" ADD CONSTRAINT "FK_46773f1da52a276064234cb12e9" FOREIGN KEY ("outputReferenceAssetId") REFERENCES "asset"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reward_batch" ADD CONSTRAINT "FK_2f99dd27e9ee7949819e738a888" FOREIGN KEY ("targetAssetId") REFERENCES "asset"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reward" ADD CONSTRAINT "FK_1dcefb73ef08eab164182e82c11" FOREIGN KEY ("batchId") REFERENCES "reward_batch"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reward" ADD CONSTRAINT "FK_433fcdac5d0dcb9914c6ec06805" FOREIGN KEY ("referenceAssetId") REFERENCES "asset"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reward" ADD CONSTRAINT "FK_6f7a9e23e612b6b0a85904c6c02" FOREIGN KEY ("targetAssetId") REFERENCES "asset"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "reward" DROP CONSTRAINT "FK_6f7a9e23e612b6b0a85904c6c02"`);
        await queryRunner.query(`ALTER TABLE "reward" DROP CONSTRAINT "FK_433fcdac5d0dcb9914c6ec06805"`);
        await queryRunner.query(`ALTER TABLE "reward" DROP CONSTRAINT "FK_1dcefb73ef08eab164182e82c11"`);
        await queryRunner.query(`ALTER TABLE "reward_batch" DROP CONSTRAINT "FK_2f99dd27e9ee7949819e738a888"`);
        await queryRunner.query(`ALTER TABLE "reward_batch" DROP CONSTRAINT "FK_46773f1da52a276064234cb12e9"`);
        await queryRunner.query(`ALTER TABLE "payout_order" DROP CONSTRAINT "FK_326829b48a410c35065d7f989a9"`);
        await queryRunner.query(`ALTER TABLE "payout_order" DROP CONSTRAINT "FK_2b1d9ab3f1d324ba5e2cc42be4e"`);
        await queryRunner.query(`ALTER TABLE "payout_order" DROP CONSTRAINT "FK_104e583561878b016c275c3c6b3"`);
        await queryRunner.query(`ALTER TABLE "liquidity_order" DROP CONSTRAINT "FK_8c116f65742249f450313610c2b"`);
        await queryRunner.query(`ALTER TABLE "liquidity_order" DROP CONSTRAINT "FK_1a898d3850e8a95e1b7bede19c6"`);
        await queryRunner.query(`ALTER TABLE "liquidity_order" DROP CONSTRAINT "FK_1e75a3f4817c922d85cf3e9be16"`);
        await queryRunner.query(`ALTER TABLE "liquidity_order" DROP CONSTRAINT "FK_5499b5d0a7e01d2433c6f6c97aa"`);
        await queryRunner.query(`ALTER TABLE "reward" ADD CONSTRAINT "DF_c8be21ce6f3ee72bea17d473055" DEFAULT 0 FOR "amountChf"`);
        await queryRunner.query(`ALTER TABLE "reward" ALTER COLUMN "amountChf" float NOT NULL`);
        await queryRunner.query(`ALTER TABLE "reward" ADD CONSTRAINT "DF_8bd5881c626339c3f7cee209dca" DEFAULT 0 FOR "amountUsd"`);
        await queryRunner.query(`ALTER TABLE "reward" ALTER COLUMN "amountUsd" float NOT NULL`);
        await queryRunner.query(`ALTER TABLE "reward" ADD CONSTRAINT "DF_76cf787f50e38c5eab4257e9b67" DEFAULT 0 FOR "amountEur"`);
        await queryRunner.query(`ALTER TABLE "reward" ALTER COLUMN "amountEur" float NOT NULL`);
        await queryRunner.query(`ALTER TABLE "reward" DROP COLUMN "targetAssetId"`);
        await queryRunner.query(`ALTER TABLE "reward" DROP COLUMN "referenceAssetId"`);
        await queryRunner.query(`ALTER TABLE "reward" DROP COLUMN "batchId"`);
        await queryRunner.query(`ALTER TABLE "reward" DROP COLUMN "isReinvest"`);
        await queryRunner.query(`ALTER TABLE "reward" DROP COLUMN "outputDate"`);
        await queryRunner.query(`ALTER TABLE "reward" DROP COLUMN "txId"`);
        await queryRunner.query(`ALTER TABLE "reward" DROP COLUMN "targetAmount"`);
        await queryRunner.query(`ALTER TABLE "reward" DROP COLUMN "targetAddress"`);
        await queryRunner.query(`ALTER TABLE "reward" DROP CONSTRAINT "DF_dd31fd6727f40b48f38e228d544"`);
        await queryRunner.query(`ALTER TABLE "reward" DROP COLUMN "feeAmount"`);
        await queryRunner.query(`ALTER TABLE "reward" DROP CONSTRAINT "DF_40ceee0f23d664ef1850a78f083"`);
        await queryRunner.query(`ALTER TABLE "reward" DROP COLUMN "feePercent"`);
        await queryRunner.query(`ALTER TABLE "reward" DROP CONSTRAINT "DF_f32f6405e6d248c9689959d7fe1"`);
        await queryRunner.query(`ALTER TABLE "reward" DROP COLUMN "outputReferenceAmount"`);
        await queryRunner.query(`ALTER TABLE "reward" DROP CONSTRAINT "DF_fe478d1da983dbe39737e9104a1"`);
        await queryRunner.query(`ALTER TABLE "reward" DROP COLUMN "inputReferenceAmount"`);
        await queryRunner.query(`ALTER TABLE "reward" ADD "assetId" int NOT NULL`);
        await queryRunner.query(`ALTER TABLE "reward" ADD "fee" float NOT NULL`);
        await queryRunner.query(`ALTER TABLE "reward" ADD CONSTRAINT "DF_bee3de89dbf732f919cbc184b5e" DEFAULT 0 FOR "fee"`);
        await queryRunner.query(`ALTER TABLE "reward" ADD "reinvestOutputDate" datetime`);
        await queryRunner.query(`ALTER TABLE "reward" ADD "reinvestTxId" nvarchar(255)`);
        await queryRunner.query(`ALTER TABLE "reward" ADD "amount" float NOT NULL`);
        await queryRunner.query(`ALTER TABLE "reward" ADD CONSTRAINT "DF_903071fa6f845566a03224c6555" DEFAULT 0 FOR "amount"`);
        await queryRunner.query(`ALTER TABLE "staking_analytics" ADD "tvl" float`);
        await queryRunner.query(`ALTER TABLE "staking_analytics" ADD "operatorCount" int`);
        await queryRunner.query(`DROP TABLE "reward_batch"`);
        await queryRunner.query(`DROP TABLE "payout_order"`);
        await queryRunner.query(`DROP TABLE "liquidity_order"`);
        await queryRunner.query(`ALTER TABLE "reward" ADD CONSTRAINT "FK_a2fb1646b57d3986fa6d97d0429" FOREIGN KEY ("assetId") REFERENCES "asset"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }
}
