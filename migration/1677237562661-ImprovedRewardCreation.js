const { MigrationInterface, QueryRunner } = require('typeorm');

module.exports = class ImprovedRewardCreation1677237562661 {
  name = 'ImprovedRewardCreation1677237562661';

  async up(queryRunner) {
    await queryRunner.query(`ALTER TABLE "dbo"."staking" DROP CONSTRAINT "DF_5303085f041dfec8d40b464a532"`);
    await queryRunner.query(`ALTER TABLE "dbo"."staking" DROP COLUMN "rewardsAmount"`);
    await queryRunner.query(`ALTER TABLE "dbo"."reward" ALTER COLUMN "inputReferenceAmount" float`);
    await queryRunner.query(`ALTER TABLE "dbo"."reward" DROP CONSTRAINT "DF_fe478d1da983dbe39737e9104a1"`);
    await queryRunner.query(`ALTER TABLE "dbo"."reward" ALTER COLUMN "outputReferenceAmount" float`);
    await queryRunner.query(`ALTER TABLE "dbo"."reward" DROP CONSTRAINT "DF_f32f6405e6d248c9689959d7fe1"`);
    await queryRunner.query(`ALTER TABLE "dbo"."reward" ALTER COLUMN "feePercent" float`);
    await queryRunner.query(`ALTER TABLE "dbo"."reward" DROP CONSTRAINT "DF_40ceee0f23d664ef1850a78f083"`);
    await queryRunner.query(`ALTER TABLE "dbo"."reward" ALTER COLUMN "feeAmount" float`);
    await queryRunner.query(`ALTER TABLE "dbo"."reward" DROP CONSTRAINT "DF_dd31fd6727f40b48f38e228d544"`);
  }

  async down(queryRunner) {
    await queryRunner.query(
      `ALTER TABLE "dbo"."reward" ADD CONSTRAINT "DF_dd31fd6727f40b48f38e228d544" DEFAULT 0 FOR "feeAmount"`,
    );
    await queryRunner.query(`ALTER TABLE "dbo"."reward" ALTER COLUMN "feeAmount" float NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "dbo"."reward" ADD CONSTRAINT "DF_40ceee0f23d664ef1850a78f083" DEFAULT 0 FOR "feePercent"`,
    );
    await queryRunner.query(`ALTER TABLE "dbo"."reward" ALTER COLUMN "feePercent" float NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "dbo"."reward" ADD CONSTRAINT "DF_f32f6405e6d248c9689959d7fe1" DEFAULT 0 FOR "outputReferenceAmount"`,
    );
    await queryRunner.query(`ALTER TABLE "dbo"."reward" ALTER COLUMN "outputReferenceAmount" float NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "dbo"."reward" ADD CONSTRAINT "DF_fe478d1da983dbe39737e9104a1" DEFAULT 0 FOR "inputReferenceAmount"`,
    );
    await queryRunner.query(`ALTER TABLE "dbo"."reward" ALTER COLUMN "inputReferenceAmount" float NOT NULL`);
    await queryRunner.query(`ALTER TABLE "dbo"."staking" ADD "rewardsAmount" float NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "dbo"."staking" ADD CONSTRAINT "DF_5303085f041dfec8d40b464a532" DEFAULT 0 FOR "rewardsAmount"`,
    );
  }
};
