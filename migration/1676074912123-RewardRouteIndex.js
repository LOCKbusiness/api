const { MigrationInterface, QueryRunner } = require('typeorm');

module.exports = class RewardRouteIndex1676074912123 {
  name = 'RewardRouteIndex1676074912123';

  async up(queryRunner) {
    await queryRunner.query(`DROP INDEX "IDX_27f6d316b762c45ed6c95d036a" ON "dbo"."reward_route"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_e524994d0f03929c46798c3e70" ON "dbo"."reward_route" ("stakingId", "targetAddressAddress", "targetAddressBlockchain", "targetAssetId", "rewardAssetId") `,
    );
  }

  async down(queryRunner) {
    await queryRunner.query(`DROP INDEX "IDX_e524994d0f03929c46798c3e70" ON "dbo"."reward_route"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_27f6d316b762c45ed6c95d036a" ON "dbo"."reward_route" ("stakingId", "targetAddressAddress", "targetAddressBlockchain", "targetAssetId") `,
    );
  }
};
