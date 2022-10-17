const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class transactionTable1666015866471 {
    name = 'transactionTable1666015866471'

    async up(queryRunner) {
        await queryRunner.query(`CREATE TABLE "transaction" ("id" nvarchar(255) NOT NULL, "updated" datetime2 NOT NULL CONSTRAINT "DF_d0a889b18fcdc8b8baf852781f3" DEFAULT getdate(), "created" datetime2 NOT NULL CONSTRAINT "DF_8abb653ad984db9d9c8c75039e9" DEFAULT getdate(), "payload" ntext, "rawTx" ntext NOT NULL, "issuerSignature" nvarchar(255) NOT NULL, "verifierSignature" nvarchar(255), "active" bit NOT NULL CONSTRAINT "DF_30986c4e2867379118019886d2c" DEFAULT 1, "signedHex" nvarchar(2048), "invalidationReason" nvarchar(255), CONSTRAINT "PK_89eadb93a89810556e1cbcd6ab9" PRIMARY KEY ("id"))`);
    }

    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE "transaction"`);
    }
}
