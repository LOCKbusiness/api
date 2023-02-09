const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class assetBuyableSellable1675928633077 {
    name = 'assetBuyableSellable1675928633077'

    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "dbo"."asset" ADD "buyable" bit NOT NULL CONSTRAINT "DF_02425ec147dfa126bfd6f41c7db" DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE "dbo"."asset" ADD "sellable" bit NOT NULL CONSTRAINT "DF_b5d5bb3aea25a3e735ec3c6a2fe" DEFAULT 0`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "dbo"."asset" DROP CONSTRAINT "DF_b5d5bb3aea25a3e735ec3c6a2fe"`);
        await queryRunner.query(`ALTER TABLE "dbo"."asset" DROP COLUMN "sellable"`);
        await queryRunner.query(`ALTER TABLE "dbo"."asset" DROP CONSTRAINT "DF_02425ec147dfa126bfd6f41c7db"`);
        await queryRunner.query(`ALTER TABLE "dbo"."asset" DROP COLUMN "buyable"`);
    }
}
