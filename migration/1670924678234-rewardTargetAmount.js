const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class rewardTargetAmount1670924678234 {
    name = 'rewardTargetAmount1670924678234'

    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "reward" ALTER COLUMN "targetAmount" float`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "reward" ALTER COLUMN "targetAmount" float NOT NULL`);
    }
}
