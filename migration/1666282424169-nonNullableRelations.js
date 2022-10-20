const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class nonNullableRelations1666282424169 {
    name = 'nonNullableRelations1666282424169'

    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "sqldb-lock-api-dev"."dbo"."pay_in" DROP CONSTRAINT "FK_ff308aed6880ce0b4a1d5db7b75"`);
        await queryRunner.query(`ALTER TABLE "sqldb-lock-api-dev"."dbo"."pay_in" ALTER COLUMN "addressId" int NOT NULL`);
        await queryRunner.query(`ALTER TABLE "sqldb-lock-api-dev"."dbo"."withdrawal" DROP CONSTRAINT "FK_3e672e3a9ef3c732ddc89598d80"`);
        await queryRunner.query(`DROP INDEX "IDX_cfe5f38641f4c670ce1d150cc5" ON "sqldb-lock-api-dev"."dbo"."withdrawal"`);
        await queryRunner.query(`ALTER TABLE "sqldb-lock-api-dev"."dbo"."withdrawal" ALTER COLUMN "stakingId" int NOT NULL`);
        await queryRunner.query(`ALTER TABLE "sqldb-lock-api-dev"."dbo"."deposit" DROP CONSTRAINT "FK_6fa6fe8124a2feb05f7ec12f770"`);
        await queryRunner.query(`ALTER TABLE "sqldb-lock-api-dev"."dbo"."deposit" ALTER COLUMN "stakingId" int NOT NULL`);
        await queryRunner.query(`ALTER TABLE "sqldb-lock-api-dev"."dbo"."wallet" DROP CONSTRAINT "FK_5f9d93bd5c22ed5b4211b26718a"`);
        await queryRunner.query(`ALTER TABLE "sqldb-lock-api-dev"."dbo"."wallet" ALTER COLUMN "walletProviderId" int NOT NULL`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_cfe5f38641f4c670ce1d150cc5" ON "sqldb-lock-api-dev"."dbo"."withdrawal" ("stakingId", "status") WHERE status = 'Draft'`);
        await queryRunner.query(`ALTER TABLE "sqldb-lock-api-dev"."dbo"."pay_in" ADD CONSTRAINT "FK_ff308aed6880ce0b4a1d5db7b75" FOREIGN KEY ("addressId") REFERENCES "sqldb-lock-api-dev".."pay_in_blockchain_address"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "sqldb-lock-api-dev"."dbo"."withdrawal" ADD CONSTRAINT "FK_3e672e3a9ef3c732ddc89598d80" FOREIGN KEY ("stakingId") REFERENCES "sqldb-lock-api-dev".."staking"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "sqldb-lock-api-dev"."dbo"."deposit" ADD CONSTRAINT "FK_6fa6fe8124a2feb05f7ec12f770" FOREIGN KEY ("stakingId") REFERENCES "sqldb-lock-api-dev".."staking"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "sqldb-lock-api-dev"."dbo"."wallet" ADD CONSTRAINT "FK_5f9d93bd5c22ed5b4211b26718a" FOREIGN KEY ("walletProviderId") REFERENCES "sqldb-lock-api-dev".."wallet_provider"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "sqldb-lock-api-dev"."dbo"."wallet" DROP CONSTRAINT "FK_5f9d93bd5c22ed5b4211b26718a"`);
        await queryRunner.query(`ALTER TABLE "sqldb-lock-api-dev"."dbo"."deposit" DROP CONSTRAINT "FK_6fa6fe8124a2feb05f7ec12f770"`);
        await queryRunner.query(`ALTER TABLE "sqldb-lock-api-dev"."dbo"."withdrawal" DROP CONSTRAINT "FK_3e672e3a9ef3c732ddc89598d80"`);
        await queryRunner.query(`ALTER TABLE "sqldb-lock-api-dev"."dbo"."pay_in" DROP CONSTRAINT "FK_ff308aed6880ce0b4a1d5db7b75"`);
        await queryRunner.query(`DROP INDEX "IDX_cfe5f38641f4c670ce1d150cc5" ON "sqldb-lock-api-dev"."dbo"."withdrawal"`);
        await queryRunner.query(`ALTER TABLE "sqldb-lock-api-dev"."dbo"."wallet" ALTER COLUMN "walletProviderId" int`);
        await queryRunner.query(`ALTER TABLE "sqldb-lock-api-dev"."dbo"."wallet" ADD CONSTRAINT "FK_5f9d93bd5c22ed5b4211b26718a" FOREIGN KEY ("walletProviderId") REFERENCES "sqldb-lock-api-dev".."wallet_provider"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "sqldb-lock-api-dev"."dbo"."deposit" ALTER COLUMN "stakingId" int`);
        await queryRunner.query(`ALTER TABLE "sqldb-lock-api-dev"."dbo"."deposit" ADD CONSTRAINT "FK_6fa6fe8124a2feb05f7ec12f770" FOREIGN KEY ("stakingId") REFERENCES "sqldb-lock-api-dev".."staking"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "sqldb-lock-api-dev"."dbo"."withdrawal" ALTER COLUMN "stakingId" int`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_cfe5f38641f4c670ce1d150cc5" ON "sqldb-lock-api-dev"."dbo"."withdrawal" ("stakingId", "status") WHERE ([status]='Draft')`);
        await queryRunner.query(`ALTER TABLE "sqldb-lock-api-dev"."dbo"."withdrawal" ADD CONSTRAINT "FK_3e672e3a9ef3c732ddc89598d80" FOREIGN KEY ("stakingId") REFERENCES "sqldb-lock-api-dev".."staking"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "sqldb-lock-api-dev"."dbo"."pay_in" ALTER COLUMN "addressId" int`);
        await queryRunner.query(`ALTER TABLE "sqldb-lock-api-dev"."dbo"."pay_in" ADD CONSTRAINT "FK_ff308aed6880ce0b4a1d5db7b75" FOREIGN KEY ("addressId") REFERENCES "sqldb-lock-api-dev".."pay_in_blockchain_address"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }
}
