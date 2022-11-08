const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class addVaultNullable1667843925772 {
    name = 'addVaultNullable1667843925772'

    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "vault" ALTER COLUMN "vault" nvarchar(255)`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "vault" ALTER COLUMN "vault" nvarchar(255) NOT NULL`);
    }
}
