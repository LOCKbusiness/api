const { MigrationInterface, QueryRunner } = require('typeorm');

module.exports = class AddedIndices1674866808464 {
  name = 'AddedIndices1674866808464';

  async up(queryRunner) {
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_00386e5600bddba937380ed7cf" ON "dbo"."reservable_blockchain_address" ("addressAddress") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_2e398e934dbc29eea57a2f55ad" ON "dbo"."payout_order" ("context", "correlationId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_64cadfbc65bebecea0a531c838" ON "dbo"."deposit" ("stakingId", "status", "created") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_98d9e16876aa95f25ebfbaa492" ON "dbo"."reward" ("batchId", "status", "rewardRouteId") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_6ccd9649f42340c15c6c125a6e" ON "dbo"."wallet" ("addressAddress") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_2e08865d3e6dcb08450d539278" ON "dbo"."user" ("kycId") WHERE kycId IS NOT NULL`,
    );
  }

  async down(queryRunner) {
    await queryRunner.query(`DROP INDEX "IDX_2e08865d3e6dcb08450d539278" ON "dbo"."user"`);
    await queryRunner.query(`DROP INDEX "IDX_6ccd9649f42340c15c6c125a6e" ON "dbo"."wallet"`);
    await queryRunner.query(`DROP INDEX "IDX_98d9e16876aa95f25ebfbaa492" ON "dbo"."reward"`);
    await queryRunner.query(`DROP INDEX "IDX_64cadfbc65bebecea0a531c838" ON "dbo"."deposit"`);
    await queryRunner.query(`DROP INDEX "IDX_2e398e934dbc29eea57a2f55ad" ON "dbo"."payout_order"`);
    await queryRunner.query(`DROP INDEX "IDX_00386e5600bddba937380ed7cf" ON "dbo"."reservable_blockchain_address"`);
  }
};
