const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class addRewardIndex1670335802666 {
    name = 'addRewardIndex1670335802666'

    async up(queryRunner) {
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_4fa2ccadaf1c5a89ae163087d0" ON "dbo"."reward" ("stakingId", "reinvestTxId") `);
    }

    async down(queryRunner) {
        await queryRunner.query(`DROP INDEX "IDX_4fa2ccadaf1c5a89ae163087d0" ON "dbo"."reward"`);
    }
}
