const { MigrationInterface, QueryRunner } = require('typeorm');

module.exports = class UtxoReservationExpire1684311350968 {
  name = 'UtxoReservationExpire1684311350968';

  async up(queryRunner) {
    await queryRunner.query(`ALTER TABLE "dbo"."utxo_reservation" ADD "expires" datetime2`);
    await queryRunner.query(`UPDATE ur SET ur.expires = ur.updated FROM "dbo"."utxo_reservation" ur`);
    await queryRunner.query(`ALTER TABLE "dbo"."utxo_reservation" ALTER COLUMN "expires" datetime2 NOT NULL`);
  }

  async down(queryRunner) {
    await queryRunner.query(`ALTER TABLE "dbo"."utxo_reservation" DROP COLUMN "expires"`);
  }
};
