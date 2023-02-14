const { MigrationInterface, QueryRunner } = require('typeorm');

module.exports = class RewardAsset1675785940968 {
  name = 'RewardAsset1675785940968';

  async up(queryRunner) {
    await queryRunner.query(`ALTER TABLE "dbo"."reward_route" ADD "rewardAssetId" int`);
    await queryRunner.query(
      `UPDATE "reward_route" SET "reward_route"."rewardAssetId" = "reward_route"."targetAssetId" FROM "reward_route"`,
    );
    await queryRunner.query(`ALTER TABLE "dbo"."reward_route" ALTER COLUMN "rewardAssetId" int NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "dbo"."reward_route" ADD CONSTRAINT "FK_aa033d1f1033ecaedcf522b3a52" FOREIGN KEY ("rewardAssetId") REFERENCES "asset"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  async down(queryRunner) {
    await queryRunner.query(`ALTER TABLE "dbo"."reward_route" DROP CONSTRAINT "FK_aa033d1f1033ecaedcf522b3a52"`);
    await queryRunner.query(`ALTER TABLE "dbo"."reward_route" DROP COLUMN "rewardAssetId"`);
  }
};
