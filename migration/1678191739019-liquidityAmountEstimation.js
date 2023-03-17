const { MigrationInterface, QueryRunner } = require('typeorm');

module.exports = class liquidityAmountEstimation1678191739019 {
  name = 'liquidityAmountEstimation1678191739019';

  async up(queryRunner) {
    await queryRunner.query(`ALTER TABLE "liquidity_order" ADD "estimatedTargetAmount" float`);
  }

  async down(queryRunner) {
    await queryRunner.query(`ALTER TABLE "liquidity_order" DROP COLUMN "estimatedTargetAmount"`);
  }
};
