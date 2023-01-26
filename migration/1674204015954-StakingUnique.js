const { MigrationInterface, QueryRunner } = require('typeorm');

module.exports = class StakingUnique1674204015954 {
  name = 'StakingUnique1674204015954';

  async up(queryRunner) {
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_9082f014464892da67c25f74d8" ON "dbo"."staking" ("userId", "strategy", "assetId") `,
    );
  }

  async down(queryRunner) {
    await queryRunner.query(`DROP INDEX "IDX_9082f014464892da67c25f74d8" ON "dbo"."staking"`);
  }
};
