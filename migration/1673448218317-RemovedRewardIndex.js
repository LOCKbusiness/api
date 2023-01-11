const { MigrationInterface, QueryRunner } = require('typeorm');

module.exports = class RemovedRewardIndex1673448218317 {
  name = 'RemovedRewardIndex1673448218317';

  async up(queryRunner) {
    await queryRunner.query(`DROP INDEX "IDX_acf5ff60bae00118bff41566cb" ON "dbo"."reward"`);
  }

  async down(queryRunner) {
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_acf5ff60bae00118bff41566cb" ON "dbo"."reward" ("stakingId", "txId") WHERE ([txId] IS NOT NULL)`,
    );
  }
};
