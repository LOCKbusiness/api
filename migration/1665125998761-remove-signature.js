const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class removeSignature1665125998761 {
    name = 'removeSignature1665125998761'

    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "masternode" DROP COLUMN "signatureLiquidityManager"`);
        await queryRunner.query(`ALTER TABLE "masternode" DROP COLUMN "signaturePayoutManager"`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "masternode" ADD "signaturePayoutManager" nvarchar(255)`);
        await queryRunner.query(`ALTER TABLE "masternode" ADD "signatureLiquidityManager" nvarchar(255)`);
    }
}
