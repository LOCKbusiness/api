const { MigrationInterface, QueryRunner } = require('typeorm');

module.exports = class TransactionCache1668782279229 {
  name = 'TransactionCache1668782279229';

  async up(queryRunner) {
    await queryRunner.query(
      `CREATE TABLE "transaction_cache" ("id" int NOT NULL IDENTITY(1,1), "updated" datetime2 NOT NULL CONSTRAINT "DF_3b901e3a8ea2a1552a4e2306d56" DEFAULT getdate(), "created" datetime2 NOT NULL CONSTRAINT "DF_602a3f2912414d9f1135c534bdb" DEFAULT getdate(), "type" nvarchar(255) NOT NULL, "correlationId" nvarchar(255) NOT NULL, "rawTx" nvarchar(MAX) NOT NULL, CONSTRAINT "PK_13eeec22ad50add4c171d51a278" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_1199c8a4ed5a0f187a6d6c6166" ON "transaction_cache" ("type", "correlationId") `,
    );
  }

  async down(queryRunner) {
    await queryRunner.query(`DROP INDEX "IDX_1199c8a4ed5a0f187a6d6c6166" ON "transaction_cache"`);
    await queryRunner.query(`DROP TABLE "transaction_cache"`);
  }
};
