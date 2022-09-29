const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class masternodeTimelock1664445550144 {
    name = 'masternodeTimelock1664445550144'

    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "masternode" ALTER COLUMN "timeLock" int NOT NULL`);
        await queryRunner.query(`ALTER TABLE "masternode" ADD CONSTRAINT "DF_4347cb69bdc0c2b495920c6deb5" DEFAULT 0 FOR "timeLock"`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "masternode" DROP CONSTRAINT "DF_4347cb69bdc0c2b495920c6deb5"`);
        await queryRunner.query(`ALTER TABLE "masternode" ALTER COLUMN "timeLock" int`);
    }
}
