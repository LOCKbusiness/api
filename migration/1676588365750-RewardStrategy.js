const { MigrationInterface, QueryRunner } = require('typeorm');

module.exports = class RewardStrategy1676588365750 {
  name = 'RewardStrategy1676588365750';

  async up(queryRunner) {
    // reward
    await queryRunner.query(`ALTER TABLE "dbo"."reward" ADD "targetAssetId" int`);
    await queryRunner.query(`ALTER TABLE "dbo"."reward" ADD "targetAddressAddress" nvarchar(255)`);
    await queryRunner.query(`ALTER TABLE "dbo"."reward" ADD "targetAddressBlockchain" nvarchar(255)`);
    await queryRunner.query(
      `UPDATE r SET r.targetAssetId = rr.targetAssetId, r.targetAddressAddress = rr.targetAddressAddress, r.targetAddressBlockchain = rr.targetAddressBlockchain FROM dbo.reward r  INNER JOIN dbo.reward_route rr ON r.rewardRouteId = rr.id`,
    );
    await queryRunner.query(`ALTER TABLE "dbo"."reward" ALTER COLUMN "targetAssetId" int NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "dbo"."reward" ADD CONSTRAINT "FK_6f7a9e23e612b6b0a85904c6c02" FOREIGN KEY ("targetAssetId") REFERENCES "asset"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );

    // reward_strategy
    await queryRunner.query(
      `CREATE TABLE "reward_strategy" ("id" int NOT NULL IDENTITY(1,1), "updated" datetime2 NOT NULL CONSTRAINT "DF_3fcab49f81465a4935e72b9f166" DEFAULT getdate(), "created" datetime2 NOT NULL CONSTRAINT "DF_d6af8bf4e8a1faa31aabffea02a" DEFAULT getdate(), "userId" int NOT NULL, CONSTRAINT "UQ_8a7ffd53abf8eeece5010d49ca6" UNIQUE ("userId"), CONSTRAINT "PK_c75fa62b40cb9ffcc32de854c7a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `INSERT INTO dbo.reward_strategy (userId) SELECT DISTINCT u.id FROM dbo.[user] u INNER JOIN dbo.staking s ON s.userId = u.id`,
    );

    // staking
    await queryRunner.query(`ALTER TABLE "dbo"."staking" ADD "rewardStrategyId" int`);
    await queryRunner.query(
      `UPDATE s SET s.rewardStrategyId = rs.id FROM dbo.staking s INNER JOIN dbo.reward_strategy rs ON s.userId = rs.userId`,
    );
    await queryRunner.query(`ALTER TABLE "dbo"."staking" ALTER COLUMN "rewardStrategyId" int NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "dbo"."staking" ADD CONSTRAINT "FK_365749bd2d9ba6213108a763361" FOREIGN KEY ("rewardStrategyId") REFERENCES "reward_strategy"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );

    // reward_route
    await queryRunner.query(`ALTER TABLE "dbo"."reward_route" DROP CONSTRAINT "FK_aa033d1f1033ecaedcf522b3a52"`);
    await queryRunner.query(`ALTER TABLE "dbo"."reward_route" DROP CONSTRAINT "FK_7c21b63ae5c88cddc49c6ba02da"`);
    await queryRunner.query(`ALTER TABLE "dbo"."reward_route" DROP CONSTRAINT "FK_9ebb8316d6c0afd1fe56b0395e7"`);
    await queryRunner.query(`DROP INDEX "IDX_e524994d0f03929c46798c3e70" ON "dbo"."reward_route"`);

    await queryRunner.query(`ALTER TABLE "dbo"."reward_route" ADD "strategyId" int`);
    await queryRunner.query(
      `UPDATE rr SET rr.strategyId = s.rewardStrategyId FROM dbo.reward_route rr INNER JOIN dbo.staking s ON rr.stakingId = s.id`,
    );
    await queryRunner.query(`ALTER TABLE "dbo"."reward_route" ALTER COLUMN "strategyId" int NOT NULL`);
    await queryRunner.query(`ALTER TABLE "dbo"."reward_route" DROP COLUMN "stakingId"`);

    await queryRunner.query(`ALTER TABLE "dbo"."reward_route" ALTER COLUMN "targetAssetId" int`);
    await queryRunner.query(`ALTER TABLE "dbo"."reward_route" DROP COLUMN "rewardAssetId"`);

    await queryRunner.query(
      `INSERT INTO "reward_route" ("label", "rewardPercent", "strategyId") SELECT 'Default', 1, rs.id FROM dbo.reward_strategy rs`,
    );

    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_0b77e1e565c3cf3035549460f0" ON "dbo"."reward_route" ("strategyId", "targetAddressAddress", "targetAddressBlockchain", "targetAssetId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "dbo"."reward_route" ADD CONSTRAINT "FK_a709d0c92cb00f1d282e38e4d32" FOREIGN KEY ("strategyId") REFERENCES "reward_strategy"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "dbo"."reward_route" ADD CONSTRAINT "FK_9ebb8316d6c0afd1fe56b0395e7" FOREIGN KEY ("targetAssetId") REFERENCES "asset"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  async down(queryRunner) {
    // reward_route
    await queryRunner.query(`ALTER TABLE "dbo"."reward_route" DROP CONSTRAINT "FK_9ebb8316d6c0afd1fe56b0395e7"`);
    await queryRunner.query(`ALTER TABLE "dbo"."reward_route" DROP CONSTRAINT "FK_a709d0c92cb00f1d282e38e4d32"`);
    await queryRunner.query(`DROP INDEX "IDX_0b77e1e565c3cf3035549460f0" ON "dbo"."reward_route"`);

    await queryRunner.query(`ALTER TABLE "dbo"."reward_route" ADD "rewardAssetId" int`);
    await queryRunner.query(`ALTER TABLE "dbo"."reward_route" ADD "stakingId" int`);
    await queryRunner.query(
      `UPDATE rr SET rr.stakingId = rs.stakingId, rr.rewardAssetId = 1 FROM dbo.reward_route rr INNER JOIN dbo.reward_strategy rs ON rr.strategyId = rs.id`,
    );
    await queryRunner.query(`ALTER TABLE "dbo"."reward_route" ALTER COLUMN "rewardAssetId" int NOT NULL`);
    await queryRunner.query(`ALTER TABLE "dbo"."reward_route" ALTER COLUMN "stakingId" int NOT NULL`);

    await queryRunner.query(`DELETE FROM dbo.reward_route WHERE targetAssetId IS NULL`);

    await queryRunner.query(`ALTER TABLE "dbo"."reward_route" ALTER COLUMN "targetAssetId" int NOT NULL`);
    await queryRunner.query(`ALTER TABLE "dbo"."reward_route" DROP COLUMN "strategyId"`);

    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_e524994d0f03929c46798c3e70" ON "dbo"."reward_route" ("stakingId", "targetAddressAddress", "targetAddressBlockchain", "targetAssetId", "rewardAssetId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "dbo"."reward_route" ADD CONSTRAINT "FK_9ebb8316d6c0afd1fe56b0395e7" FOREIGN KEY ("targetAssetId") REFERENCES "asset"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "dbo"."reward_route" ADD CONSTRAINT "FK_7c21b63ae5c88cddc49c6ba02da" FOREIGN KEY ("stakingId") REFERENCES "staking"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "dbo"."reward_route" ADD CONSTRAINT "FK_aa033d1f1033ecaedcf522b3a52" FOREIGN KEY ("rewardAssetId") REFERENCES "asset"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );

    // staking
    await queryRunner.query(`ALTER TABLE "dbo"."staking" DROP CONSTRAINT "FK_365749bd2d9ba6213108a763361"`);
    await queryRunner.query(`ALTER TABLE "dbo"."staking" DROP COLUMN "rewardStrategyId"`);

    // reward_strategy
    await queryRunner.query(`DROP TABLE "reward_strategy"`);

    // reward
    await queryRunner.query(`ALTER TABLE "dbo"."reward" DROP CONSTRAINT "FK_6f7a9e23e612b6b0a85904c6c02"`);
    await queryRunner.query(`ALTER TABLE "dbo"."reward" DROP COLUMN "targetAddressBlockchain"`);
    await queryRunner.query(`ALTER TABLE "dbo"."reward" DROP COLUMN "targetAddressAddress"`);
    await queryRunner.query(`ALTER TABLE "dbo"."reward" DROP COLUMN "targetAssetId"`);
  }
};
