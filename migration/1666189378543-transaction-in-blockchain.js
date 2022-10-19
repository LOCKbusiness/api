const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class transactionInBlockchain1666189378543 {
    name = 'transactionInBlockchain1666189378543'

    async up(queryRunner) {
        await queryRunner.query(`EXEC sp_rename "sqldb-lock-api-dev.dbo.transaction.active", "inBlockchain"`);
        await queryRunner.query(`ALTER TABLE "transaction" DROP CONSTRAINT "DF_30986c4e2867379118019886d2c"`);
        await queryRunner.query(`ALTER TABLE "transaction" ADD CONSTRAINT "DF_440e43573633842aab528d19c49" DEFAULT 0 FOR "inBlockchain"`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "transaction" DROP CONSTRAINT "DF_440e43573633842aab528d19c49"`);
        await queryRunner.query(`ALTER TABLE "transaction" ADD CONSTRAINT "DF_30986c4e2867379118019886d2c" DEFAULT 1 FOR "inBlockchain"`);
        await queryRunner.query(`EXEC sp_rename "sqldb-lock-api-dev.dbo.transaction.inBlockchain", "active"`);
    }
}
