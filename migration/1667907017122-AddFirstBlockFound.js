const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class AddFirstBlockFound1667907017122 {
    name = 'AddFirstBlockFound1667907017122'

    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "masternode" ADD "firstBlockFound" datetime2`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "masternode" DROP COLUMN "firstBlockFound"`);
    }
}
