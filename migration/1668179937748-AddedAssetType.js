const { MigrationInterface, QueryRunner } = require('typeorm');

module.exports = class AddedAssetType1668179937748 {
  name = 'AddedAssetType1668179937748';

  async up(queryRunner) {
    await queryRunner.query(`DROP INDEX "nameBlockchain" ON "dbo"."asset"`);
    await queryRunner.query(
      `ALTER TABLE "dbo"."asset" ADD "type" nvarchar(255) NOT NULL CONSTRAINT "DF_37ac8e73568722867e6a1f83466" DEFAULT 'Token'`,
    );
    await queryRunner.query(
      `ALTER TABLE "dbo"."staking" ADD "strategy" nvarchar(255) NOT NULL CONSTRAINT "DF_26a16a499dcf8b1ecc059f012b0" DEFAULT 'Masternode'`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "nameTypeBlockchain" ON "dbo"."asset" ("name", "type", "blockchain") `,
    );
  }

  async down(queryRunner) {
    await queryRunner.query(`DROP INDEX "nameTypeBlockchain" ON "dbo"."asset"`);
    await queryRunner.query(`ALTER TABLE "dbo"."staking" DROP CONSTRAINT "DF_26a16a499dcf8b1ecc059f012b0"`);
    await queryRunner.query(`ALTER TABLE "dbo"."staking" DROP COLUMN "strategy"`);
    await queryRunner.query(`ALTER TABLE "dbo"."asset" DROP CONSTRAINT "DF_37ac8e73568722867e6a1f83466"`);
    await queryRunner.query(`ALTER TABLE "dbo"."asset" DROP COLUMN "type"`);
    await queryRunner.query(`CREATE UNIQUE INDEX "nameBlockchain" ON "dbo"."asset" ("name", "blockchain") `);
  }
};
