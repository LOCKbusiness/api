const { MigrationInterface, QueryRunner } = require('typeorm');

module.exports = class ImprovedStakingAnalytics1668184896956 {
  name = 'ImprovedStakingAnalytics1668184896956';

  async up(queryRunner) {
    await queryRunner.query(`DELETE FROM "dbo"."staking_analytics"`);
    await queryRunner.query(`ALTER TABLE "dbo"."staking_analytics" ADD "strategy" nvarchar(255) NOT NULL`);
    await queryRunner.query(`ALTER TABLE "dbo"."staking_analytics" ADD "assetId" int NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "dbo"."staking_analytics" ADD CONSTRAINT "FK_af66c8e0dc4ba3e005f69949b79" FOREIGN KEY ("assetId") REFERENCES "asset"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  async down(queryRunner) {
    await queryRunner.query(`ALTER TABLE "dbo"."staking_analytics" DROP CONSTRAINT "FK_af66c8e0dc4ba3e005f69949b79"`);
    await queryRunner.query(`ALTER TABLE "dbo"."staking_analytics" DROP COLUMN "assetId"`);
    await queryRunner.query(`ALTER TABLE "dbo"."staking_analytics" DROP COLUMN "strategy"`);
  }
};
