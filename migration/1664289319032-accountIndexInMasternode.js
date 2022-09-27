const { MigrationInterface, QueryRunner } = require('typeorm');

module.exports = class accountIndexInMasternode1664289319032 {
  name = 'accountIndexInMasternode1664289319032';

  async up(queryRunner) {
    await queryRunner.query(`ALTER TABLE "masternode" ADD "accountIndex" int`);
  }

  async down(queryRunner) {
    await queryRunner.query(`ALTER TABLE "masternode" DROP COLUMN "accountIndex"`);
  }
};
