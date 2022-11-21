const { MigrationInterface, QueryRunner } = require('typeorm');

module.exports = class TransactionTableSyncable1668511199801 {
  name = 'TransactionTableSyncable1668511199801';

  async up(queryRunner) {
    await queryRunner.query(
      `CREATE TABLE "transaction2" ("id" int NOT NULL IDENTITY(1,1), "updated" datetime2 NOT NULL CONSTRAINT "DF_883e905d951becd107f289453f2" DEFAULT getdate(), "created" datetime2 NOT NULL CONSTRAINT "DF_909d4e8c86076465e04a6df73ee" DEFAULT getdate(), "chainId" nvarchar(255) NOT NULL, "payload" nvarchar(MAX), "rawTx" nvarchar(MAX) NOT NULL, "issuerSignature" nvarchar(255) NOT NULL, "verifierSignature" nvarchar(255), "inBlockchain" bit NOT NULL CONSTRAINT "DF_dbd140e13e679282237daf2858c" DEFAULT 0, "signedHex" nvarchar(MAX), "invalidationReason" nvarchar(255), CONSTRAINT "UQ_4bc8e095e355174d57e0e8e8510" UNIQUE ("chainId"), CONSTRAINT "PK_c75c82592cf329d9e972f6f96b6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `INSERT INTO "transaction2" ("updated", "created", "chainId", "payload", "rawTx", "issuerSignature", "verifierSignature", "inBlockchain", "signedHex", "invalidationReason") SELECT "updated", "created", "id", "payload", "rawTx", "issuerSignature", "verifierSignature", "inBlockchain", "signedHex", "invalidationReason" FROM "transaction" ORDER BY "created" ASC`,
    );
    await queryRunner.query(`DROP TABLE "transaction"`);
    await queryRunner.query(`EXEC sp_rename "transaction2", "transaction"`);
  }

  async down(queryRunner) {
    await queryRunner.query(
      `CREATE TABLE "transaction2" ("id" nvarchar(255) NOT NULL, "updated" datetime2 NOT NULL CONSTRAINT "DF_f548ef0be827cf121f5641f4c13" DEFAULT getdate(), "created" datetime2 NOT NULL CONSTRAINT "DF_160f839c78dad08e38b0c918303" DEFAULT getdate(), "payload" nvarchar(MAX), "rawTx" nvarchar(MAX) NOT NULL, "issuerSignature" nvarchar(255) NOT NULL, "verifierSignature" nvarchar(255), "inBlockchain" bit NOT NULL CONSTRAINT "DF_e9845075f8bc5b50c17cd94cd4e" DEFAULT 0, "signedHex" nvarchar(MAX), "invalidationReason" nvarchar(255), CONSTRAINT "PK_eef11b2fcc6e523b81f3cf00576" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `INSERT INTO "transaction2" ("updated", "created", "id", "payload", "rawTx", "issuerSignature", "verifierSignature", "inBlockchain", "signedHex", "invalidationReason") SELECT "updated", "created", "chainId", "payload", "rawTx", "issuerSignature", "verifierSignature", "inBlockchain", "signedHex", "invalidationReason" FROM "transaction"`,
    );
    await queryRunner.query(`DROP TABLE "transaction"`);
    await queryRunner.query(`EXEC sp_rename "transaction2", "transaction"`);
  }
};
