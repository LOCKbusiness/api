const { MigrationInterface, QueryRunner } = require('typeorm');

module.exports = class StagedStakingBalances1669997850930 {
  name = 'StagedStakingBalances1669997850930';

  async up(queryRunner) {
    await queryRunner.query(
      `ALTER TABLE "dbo"."staking" ADD "stageOneBalance" float NOT NULL CONSTRAINT "DF_2da628d68dc2fb24e382ac941b9" DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "dbo"."staking" ADD "stageTwoBalance" float NOT NULL CONSTRAINT "DF_e33ed9712d5705d569755afff7d" DEFAULT 0`,
    );
  }

  async down(queryRunner) {
    await queryRunner.query(`ALTER TABLE "dbo"."staking" DROP CONSTRAINT "DF_e33ed9712d5705d569755afff7d"`);
    await queryRunner.query(`ALTER TABLE "dbo"."staking" DROP COLUMN "stageTwoBalance"`);
    await queryRunner.query(`ALTER TABLE "dbo"."staking" DROP CONSTRAINT "DF_2da628d68dc2fb24e382ac941b9"`);
    await queryRunner.query(`ALTER TABLE "dbo"."staking" DROP COLUMN "stageOneBalance"`);
  }
};
