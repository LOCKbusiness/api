const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class stakingAnalytics1664194310661 {
    name = 'stakingAnalytics1664194310661'

    async up(queryRunner) {
        await queryRunner.query(`CREATE TABLE "staking_analytics" ("id" int NOT NULL IDENTITY(1,1), "updated" datetime2 NOT NULL CONSTRAINT "DF_5ec3515a6e22b1112fa8908bf05" DEFAULT getdate(), "created" datetime2 NOT NULL CONSTRAINT "DF_c61415112e35e55245fdddc4b20" DEFAULT getdate(), "apr" float, "apy" float, CONSTRAINT "PK_21e23c6ca7de55976ee933c518c" PRIMARY KEY ("id"))`);
    }

    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE "staking_analytics"`);
    }
}
