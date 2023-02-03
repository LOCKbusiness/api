const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class vaultTakeLoan1675422602772 {
    name = 'vaultTakeLoan1675422602772'

    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "dbo"."vault" ADD "takeLoanAddress" nvarchar(255)`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "dbo"."vault" DROP COLUMN "takeLoanAddress"`);
    }
}
