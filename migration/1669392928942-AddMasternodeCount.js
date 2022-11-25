const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class AddMasternodeCount1669392928942 {
    name = 'AddMasternodeCount1669392928942'

    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "staking_analytics" ADD "masternodeCount" float`);
        await queryRunner.query(`ALTER TABLE "staking_analytics" ADD "tvl" float`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "staking_analytics" DROP COLUMN "tvl"`);
        await queryRunner.query(`ALTER TABLE "staking_analytics" DROP COLUMN "masternodeCount"`);
    }
}
