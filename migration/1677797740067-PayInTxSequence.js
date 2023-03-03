const { MigrationInterface, QueryRunner } = require('typeorm');

module.exports = class PayInTxSequence1677797740067 {
  name = 'PayInTxSequence1677797740067';

  async up(queryRunner) {
    await queryRunner.query(`ALTER TABLE "dbo"."pay_in" ADD "txSequence" int`);
    await queryRunner.query(`ALTER TABLE "dbo"."deposit" ADD "payInTxSequence" int`);
  }

  async down(queryRunner) {
    await queryRunner.query(`ALTER TABLE "dbo"."deposit" DROP COLUMN "payInTxSequence"`);
    await queryRunner.query(`ALTER TABLE "dbo"."pay_in" DROP COLUMN "txSequence"`);
  }
};
