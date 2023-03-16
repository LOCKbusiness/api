const { MigrationInterface, QueryRunner } = require('typeorm');

module.exports = class UtxoReservation1678722311922 {
  name = 'UtxoReservation1678722311922';

  async up(queryRunner) {
    await queryRunner.query(
      `CREATE TABLE "utxo_reservation" ("id" int NOT NULL IDENTITY(1,1), "updated" datetime2 NOT NULL CONSTRAINT "DF_3dfe634cec669e4d161aaaa1470" DEFAULT getdate(), "created" datetime2 NOT NULL CONSTRAINT "DF_6e339f6e3850f9a7b3c0b925b26" DEFAULT getdate(), "address" nvarchar(255) NOT NULL, "utxo" nvarchar(255) NOT NULL, CONSTRAINT "PK_2e546b39869a8ea262a45b1ff9c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_445838950748fe2f4a84695d9b" ON "utxo_reservation" ("address", "utxo") `,
    );
    await queryRunner.query(`ALTER TABLE "dbo"."notification" ALTER COLUMN "correlationId" nvarchar(1023) NOT NULL`);
  }

  async down(queryRunner) {
    await queryRunner.query(`ALTER TABLE "dbo"."notification" ALTER COLUMN "correlationId" nvarchar(255) NOT NULL`);
    await queryRunner.query(`DROP INDEX "IDX_445838950748fe2f4a84695d9b" ON "utxo_reservation"`);
    await queryRunner.query(`DROP TABLE "utxo_reservation"`);
  }
};
