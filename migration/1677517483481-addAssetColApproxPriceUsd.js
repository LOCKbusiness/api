const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class addAssetColApproxPriceUsd1677517483481 {
    name = 'addAssetColApproxPriceUsd1677517483481'

    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "dbo"."asset" ADD "approxPriceUsd" float`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "dbo"."asset" DROP COLUMN "approxPriceUsd"`);
    }
}
