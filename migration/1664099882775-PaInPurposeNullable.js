const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class PaInPurposeNullable1664099882775 {
    name = 'PaInPurposeNullable1664099882775'

    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "pay_in" ADD "addressId" int`);
        await queryRunner.query(`ALTER TABLE "pay_in" ALTER COLUMN "purpose" nvarchar(255)`);
        await queryRunner.query(`CREATE UNIQUE INDEX "REL_ff308aed6880ce0b4a1d5db7b7" ON "pay_in" ("addressId") WHERE "addressId" IS NOT NULL`);
        await queryRunner.query(`ALTER TABLE "pay_in" ADD CONSTRAINT "FK_ff308aed6880ce0b4a1d5db7b75" FOREIGN KEY ("addressId") REFERENCES "pay_in_blockchain_address"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "pay_in" DROP CONSTRAINT "FK_ff308aed6880ce0b4a1d5db7b75"`);
        await queryRunner.query(`DROP INDEX "REL_ff308aed6880ce0b4a1d5db7b7" ON "pay_in"`);
        await queryRunner.query(`ALTER TABLE "pay_in" ALTER COLUMN "purpose" nvarchar(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "pay_in" DROP COLUMN "addressId"`);
    }
}
