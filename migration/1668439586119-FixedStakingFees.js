const { MigrationInterface, QueryRunner } = require('typeorm');

module.exports = class FixedStakingFees1668439586119 {
  name = 'FixedStakingFees1668439586119';

  async up(queryRunner) {
    await queryRunner.query(`ALTER TABLE "dbo"."staking" ALTER COLUMN "fee" float`);
    await queryRunner.query(`ALTER TABLE "dbo"."staking" DROP CONSTRAINT "DF_59602c4a1c29c878da3d2673a6e"`);
  }

  async down(queryRunner) {
    await queryRunner.query(
      `ALTER TABLE "dbo"."staking" ADD CONSTRAINT "DF_59602c4a1c29c878da3d2673a6e" DEFAULT 0.05 FOR "fee"`,
    );
    await queryRunner.query(`ALTER TABLE "dbo"."staking" ALTER COLUMN "fee" float NOT NULL`);
  }
};
