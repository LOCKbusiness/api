const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class addVaultEmergency1670318473239 {
    name = 'addVaultEmergency1670318473239'

    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "vault" ADD "emergencyCollateralRatio" int NOT NULL CONSTRAINT "DF_6bfc4424dca009f6663dd4c4ad0" DEFAULT 155`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "vault" DROP CONSTRAINT "DF_6bfc4424dca009f6663dd4c4ad0"`);
        await queryRunner.query(`ALTER TABLE "vault" DROP COLUMN "emergencyCollateralRatio"`);
    }
}
