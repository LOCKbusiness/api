const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class addAssetChainId1678100376744 {
    name = 'addAssetChainId1678100376744'

    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "dbo"."asset" ADD "chainId" nvarchar(255)`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "dbo"."asset" DROP COLUMN "chainId"`);
    }
}
