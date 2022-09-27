const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class withdrawalPreparationRemoved1664199379331 {
    name = 'withdrawalPreparationRemoved1664199379331'

    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "withdrawal" DROP COLUMN "prepareTxId"`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "withdrawal" ADD "prepareTxId" nvarchar(255)`);
    }
}
