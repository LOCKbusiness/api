const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class transactionColumnsMax1666266062982 {
    name = 'transactionColumnsMax1666266062982'

    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "transaction" DROP COLUMN "payload"`);
        await queryRunner.query(`ALTER TABLE "transaction" ADD "payload" nvarchar(MAX)`);
        await queryRunner.query(`ALTER TABLE "transaction" DROP COLUMN "rawTx"`);
        await queryRunner.query(`ALTER TABLE "transaction" ADD "rawTx" nvarchar(MAX)`);
        await queryRunner.query(`ALTER TABLE "transaction" DROP COLUMN "signedHex"`);
        await queryRunner.query(`ALTER TABLE "transaction" ADD "signedHex" nvarchar(MAX)`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "transaction" DROP COLUMN "signedHex"`);
        await queryRunner.query(`ALTER TABLE "transaction" ADD "signedHex" ntext`);
        await queryRunner.query(`ALTER TABLE "transaction" DROP COLUMN "rawTx"`);
        await queryRunner.query(`ALTER TABLE "transaction" ADD "rawTx" ntext NOT NULL`);
        await queryRunner.query(`ALTER TABLE "transaction" DROP COLUMN "payload"`);
        await queryRunner.query(`ALTER TABLE "transaction" ADD "payload" ntext`);
    }
}
