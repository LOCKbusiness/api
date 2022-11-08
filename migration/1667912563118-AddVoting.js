const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class AddVoting1667912563118 {
    name = 'AddVoting1667912563118'

    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "masternode" ADD "firstBlockFound" datetime2`);
        await queryRunner.query(`ALTER TABLE "user" ADD "votes" nvarchar(255)`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "votes"`);
        await queryRunner.query(`ALTER TABLE "masternode" DROP COLUMN "firstBlockFound"`);
    }
}
