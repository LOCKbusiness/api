const { MigrationInterface, QueryRunner } = require('typeorm');

module.exports = class PayInTxSequenceBigInt1677859905516 {
  name = 'PayInTxSequenceBigInt1677859905516';

  async up(queryRunner) {
    await queryRunner.query(`ALTER TABLE "dbo"."pay_in" ALTER COLUMN "txSequence" bigint`);
    await queryRunner.query(`ALTER TABLE "dbo"."deposit" ALTER COLUMN "payInTxSequence" bigint`);
  }

  async down(queryRunner) {
    await queryRunner.query(`ALTER TABLE "dbo"."deposit" ALTER COLUMN "payInTxSequence" int`);
    await queryRunner.query(`ALTER TABLE "dbo"."pay_in" ALTER COLUMN "txSequence" int`);
  }
};
