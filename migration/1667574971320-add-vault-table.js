const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class addVaultTable1667574971320 {
    name = 'addVaultTable1667574971320'

    async up(queryRunner) {
        await queryRunner.query(`CREATE TABLE "vault" ("id" int NOT NULL IDENTITY(1,1), "updated" datetime2 NOT NULL CONSTRAINT "DF_2f6bc29c947104a56e59bd2bc94" DEFAULT getdate(), "created" datetime2 NOT NULL CONSTRAINT "DF_431c1b797ea8b8402689360df62" DEFAULT getdate(), "wallet" nvarchar(255) NOT NULL, "accountIndex" int NOT NULL, "address" nvarchar(255) NOT NULL, "vault" nvarchar(255) NOT NULL, "blockchainPairId" int NOT NULL, "blockchainPairTokenAId" int NOT NULL, "blockchainPairTokenBId" int NOT NULL, "minCollateralRatio" int NOT NULL, "maxCollateralRatio" int NOT NULL, CONSTRAINT "PK_dd0898234c77f9d97585171ac59" PRIMARY KEY ("id"))`);
    }

    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE "vault"`);
    }
}
