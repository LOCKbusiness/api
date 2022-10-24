const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class transactionColumnsMax1666266062982 {
    name = 'transactionColumnsMax1666266062982'

    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "transaction" ALTER COLUMN "payload" nvarchar(MAX)`);
        await queryRunner.query(`ALTER TABLE "transaction" ALTER COLUMN "rawTx" nvarchar(MAX) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "transaction" ALTER COLUMN "signedHex" nvarchar(MAX)`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "transaction" ALTER COLUMN "payload" ntext`);
        await queryRunner.query(`ALTER TABLE "transaction" ALTER COLUMN "rawTx" ntext NOT NULL`);
        await queryRunner.query(`ALTER TABLE "transaction" ALTER COLUMN "signedHex" ntext`);
    }
}
