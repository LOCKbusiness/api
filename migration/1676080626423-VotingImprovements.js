const { MigrationInterface, QueryRunner } = require('typeorm');

module.exports = class VotingImprovements1676080626423 {
  name = 'VotingImprovements1676080626423';

  async up(queryRunner) {
    await queryRunner.query(
      `ALTER TABLE "dbo"."vote" ADD "status" nvarchar(255) NOT NULL CONSTRAINT "DF_d295577b6c4504ec1ef86b4b935" DEFAULT 'Created'`,
    );
  }

  async down(queryRunner) {
    await queryRunner.query(`ALTER TABLE "dbo"."vote" DROP CONSTRAINT "DF_d295577b6c4504ec1ef86b4b935"`);
    await queryRunner.query(`ALTER TABLE "dbo"."vote" DROP COLUMN "status"`);
  }
};
