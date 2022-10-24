const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class withdrawalSignMessage1664270474156 {
    name = 'withdrawalSignMessage1664270474156'

    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "withdrawal" ADD "signMessage" nvarchar(255)`);
        await queryRunner.query(`ALTER TABLE "withdrawal" ALTER COLUMN "signature" nvarchar(255)`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "withdrawal" ALTER COLUMN "signature" nvarchar(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "withdrawal" DROP COLUMN "signMessage"`);
    }
}
