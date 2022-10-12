const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class assetStakingMetadata1665589327465 {
    name = 'assetStakingMetadata1665589327465'

    async up(queryRunner) {
        await queryRunner.query(`CREATE TABLE "asset_staking_metadata" ("id" int NOT NULL IDENTITY(1,1), "updated" datetime2 NOT NULL CONSTRAINT "DF_1ada9d279adfb08153dd2d88e85" DEFAULT getdate(), "created" datetime2 NOT NULL CONSTRAINT "DF_71d8a6f859877bb5ca78ab1ace4" DEFAULT getdate(), "fiatPriceProviderAssetId" nvarchar(255) NOT NULL, "assetId" int NOT NULL, CONSTRAINT "PK_a1d21a460d082fb4af25491da27" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "REL_0250b7319d6976a9e66a13befd" ON "asset_staking_metadata" ("assetId") WHERE "assetId" IS NOT NULL`);
        await queryRunner.query(`ALTER TABLE "deposit" ADD "amountEur" float`);
        await queryRunner.query(`ALTER TABLE "deposit" ADD "amountUsd" float`);
        await queryRunner.query(`ALTER TABLE "deposit" ADD "amountChf" float`);
        await queryRunner.query(`ALTER TABLE "withdrawal" ADD "amountEur" float`);
        await queryRunner.query(`ALTER TABLE "withdrawal" ADD "amountUsd" float`);
        await queryRunner.query(`ALTER TABLE "withdrawal" ADD "amountChf" float`);
        await queryRunner.query(`ALTER TABLE "asset_staking_metadata" ADD CONSTRAINT "FK_0250b7319d6976a9e66a13befd7" FOREIGN KEY ("assetId") REFERENCES "asset"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "asset_staking_metadata" DROP CONSTRAINT "FK_0250b7319d6976a9e66a13befd7"`);
        await queryRunner.query(`ALTER TABLE "withdrawal" DROP COLUMN "amountChf"`);
        await queryRunner.query(`ALTER TABLE "withdrawal" DROP COLUMN "amountUsd"`);
        await queryRunner.query(`ALTER TABLE "withdrawal" DROP COLUMN "amountEur"`);
        await queryRunner.query(`ALTER TABLE "deposit" DROP COLUMN "amountChf"`);
        await queryRunner.query(`ALTER TABLE "deposit" DROP COLUMN "amountUsd"`);
        await queryRunner.query(`ALTER TABLE "deposit" DROP COLUMN "amountEur"`);
        await queryRunner.query(`DROP INDEX "REL_0250b7319d6976a9e66a13befd" ON "asset_staking_metadata"`);
        await queryRunner.query(`DROP TABLE "asset_staking_metadata"`);
    }
}
