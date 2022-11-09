const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class AddVoting1667943958100 {
    name = 'AddVoting1667943958100'

    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "masternode" ADD "firstBlockFound" datetime2`);
        await queryRunner.query(`ALTER TABLE "user" ADD "votes" nvarchar(MAX)`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "votes"`);
        await queryRunner.query(`ALTER TABLE "masternode" DROP COLUMN "firstBlockFound"`);
    }
}
