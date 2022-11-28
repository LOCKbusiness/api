const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class AddOperatorCount1669462045196 {
    name = 'AddOperatorCount1669462045196'

    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "staking_analytics" ADD "operatorCount" int`);
        await queryRunner.query(`ALTER TABLE "staking_analytics" ADD "tvl" float`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "staking_analytics" DROP COLUMN "tvl"`);
        await queryRunner.query(`ALTER TABLE "staking_analytics" DROP COLUMN "operatorCount"`);
    }
}
