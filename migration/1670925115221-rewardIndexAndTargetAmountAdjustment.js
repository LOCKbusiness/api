const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class rewardIndexAndTargetAmountAdjustment1670925115221 {
    name = 'rewardIndexAndTargetAmountAdjustment1670925115221'

    async up(queryRunner) {
        await queryRunner.query(`DROP INDEX "IDX_88981d7ad8b1e442008a7041c5" ON "reward"`);
        await queryRunner.query(`ALTER TABLE "reward" ALTER COLUMN "targetAmount" float`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_acf5ff60bae00118bff41566cb" ON "reward" ("stakingId", "txId") WHERE txId IS NOT NULL`);
    }

    async down(queryRunner) {
        await queryRunner.query(`DROP INDEX "IDX_acf5ff60bae00118bff41566cb" ON "reward"`);
        await queryRunner.query(`ALTER TABLE "reward" ALTER COLUMN "targetAmount" float NOT NULL`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_88981d7ad8b1e442008a7041c5" ON "reward" ("stakingId", "txId") `);
    }
}
