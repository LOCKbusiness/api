const { MigrationInterface, QueryRunner } = require('typeorm');

module.exports = class withdrawalDraftIndex1664280056828 {
  name = 'withdrawalDraftIndex1664280056828';

  async up(queryRunner) {
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_cfe5f38641f4c670ce1d150cc5" ON "withdrawal" ("stakingId", "status") WHERE status = 'Draft'`,
    );
  }

  async down(queryRunner) {
    await queryRunner.query(`DROP INDEX "IDX_cfe5f38641f4c670ce1d150cc5" ON "withdrawal"`);
  }
};
