const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class PayInAddressMany1664470337237 {
    name = 'PayInAddressMany1664470337237'

    async up(queryRunner) {
        await queryRunner.query(`DROP INDEX "REL_ff308aed6880ce0b4a1d5db7b7" ON "pay_in"`);
    }

    async down(queryRunner) {
        await queryRunner.query(`CREATE UNIQUE INDEX "REL_ff308aed6880ce0b4a1d5db7b7" ON "pay_in" ("addressId") WHERE ([addressId] IS NOT NULL)`);
    }
}
