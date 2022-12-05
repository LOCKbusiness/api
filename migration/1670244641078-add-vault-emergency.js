const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class addVaultEmergency1670244641078 {
    name = 'addVaultEmergency1670244641078'

    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "vault" ADD "emergencyCollateralRatio" int NOT NULL`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "vault" DROP COLUMN "emergencyCollateralRatio"`);
    }
}
