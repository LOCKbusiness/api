const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class transactionSignedHex1666255153278 {
    name = 'transactionSignedHex1666255153278'

    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "transaction" DROP COLUMN "signedHex"`);
        await queryRunner.query(`ALTER TABLE "transaction" ADD "signedHex" ntext`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "transaction" DROP COLUMN "signedHex"`);
        await queryRunner.query(`ALTER TABLE "transaction" ADD "signedHex" nvarchar(2048)`);
    }
}
