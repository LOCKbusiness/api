const { MigrationInterface, QueryRunner } = require('typeorm');

module.exports = class Voting1674731198486 {
  name = 'Voting1674731198486';

  async up(queryRunner) {
    await queryRunner.query(
      `CREATE TABLE "vote" ("id" int NOT NULL IDENTITY(1,1), "updated" datetime2 NOT NULL CONSTRAINT "DF_7879f109160dda40627c5bd8e54" DEFAULT getdate(), "created" datetime2 NOT NULL CONSTRAINT "DF_bfc510911e18f08d17f6d723760" DEFAULT getdate(), "proposalId" nvarchar(255) NOT NULL, "proposalName" nvarchar(255) NOT NULL, "decision" nvarchar(255) NOT NULL, "txId" nvarchar(255), "masternodeId" int NOT NULL, CONSTRAINT "PK_2d5932d46afe39c8176f9d4be72" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_19170d74c8771ecb48ca1aa27b" ON "vote" ("masternodeId", "proposalId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "vote" ADD CONSTRAINT "FK_cc72dbe911b688231e54fa1695b" FOREIGN KEY ("masternodeId") REFERENCES "masternode"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  async down(queryRunner) {
    await queryRunner.query(`ALTER TABLE "vote" DROP CONSTRAINT "FK_cc72dbe911b688231e54fa1695b"`);
    await queryRunner.query(`DROP INDEX "IDX_19170d74c8771ecb48ca1aa27b" ON "vote"`);
    await queryRunner.query(`DROP TABLE "vote"`);
  }
};
