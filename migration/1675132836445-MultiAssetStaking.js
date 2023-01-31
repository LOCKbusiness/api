const { MigrationInterface, QueryRunner } = require('typeorm');

module.exports = class MultiAssetStaking1675132836445 {
  name = 'MultiAssetStaking1675132836445';

  async up(queryRunner) {
    await queryRunner.query(`ALTER TABLE "dbo"."staking" DROP CONSTRAINT "FK_9d5dbacb7704b48178b2953cd8f"`);
    await queryRunner.query(`DROP INDEX "IDX_9082f014464892da67c25f74d8" ON "dbo"."staking"`);
    await queryRunner.query(
      `CREATE TABLE "staking_balance" ("id" int NOT NULL IDENTITY(1,1), "updated" datetime2 NOT NULL CONSTRAINT "DF_6ee281dced3a2e898564556c008" DEFAULT getdate(), "created" datetime2 NOT NULL CONSTRAINT "DF_b5aed69fbfbca6d47178451d170" DEFAULT getdate(), "balance" float NOT NULL CONSTRAINT "DF_fe5459b56ccadf9dde61412e91b" DEFAULT 0, "stageOneBalance" float NOT NULL CONSTRAINT "DF_af467c0b177cd3c9bef46ef8214" DEFAULT 0, "stageTwoBalance" float NOT NULL CONSTRAINT "DF_2d0203ee86a755a82e4531eb9a9" DEFAULT 0, "stakingId" int NOT NULL, "assetId" int NOT NULL, CONSTRAINT "PK_b077ad07d7554cf37ed1f90f5b7" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_a023e936b304b5118b75c99dbd" ON "staking_balance" ("stakingId", "assetId") `,
    );
    await queryRunner.query(
      `INSERT INTO "dbo"."staking_balance" (stakingId, assetId, balance, stageOneBalance, stageTwoBalance) SELECT id, assetId, balance, stageOneBalance, stageTwoBalance FROM "dbo"."staking"`,
    );
    await queryRunner.query(`ALTER TABLE "dbo"."staking" DROP CONSTRAINT "DF_73123fbb52548e2f205c1739f22"`);
    await queryRunner.query(`ALTER TABLE "dbo"."staking" DROP COLUMN "balance"`);
    await queryRunner.query(`ALTER TABLE "dbo"."staking" DROP COLUMN "assetId"`);
    await queryRunner.query(`ALTER TABLE "dbo"."staking" DROP CONSTRAINT "DF_2da628d68dc2fb24e382ac941b9"`);
    await queryRunner.query(`ALTER TABLE "dbo"."staking" DROP COLUMN "stageOneBalance"`);
    await queryRunner.query(`ALTER TABLE "dbo"."staking" DROP CONSTRAINT "DF_e33ed9712d5705d569755afff7d"`);
    await queryRunner.query(`ALTER TABLE "dbo"."staking" DROP COLUMN "stageTwoBalance"`);
    await queryRunner.query(
      `ALTER TABLE "dbo"."staking" ADD "blockchain" nvarchar(255) NOT NULL CONSTRAINT "DF_453d51a0e273da9c09171581e27" DEFAULT 'DeFiChain'`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_caf83dbef4196e0979cba098f9" ON "dbo"."staking" ("userId", "strategy") `,
    );
    await queryRunner.query(
      `ALTER TABLE "staking_balance" ADD CONSTRAINT "FK_73b5f990ec5d75b3fd2eb2dd0dc" FOREIGN KEY ("stakingId") REFERENCES "staking"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "staking_balance" ADD CONSTRAINT "FK_d4fac9599b5a45c86f693f4394c" FOREIGN KEY ("assetId") REFERENCES "asset"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  async down(queryRunner) {
    await queryRunner.query(`ALTER TABLE "staking_balance" DROP CONSTRAINT "FK_d4fac9599b5a45c86f693f4394c"`);
    await queryRunner.query(`ALTER TABLE "staking_balance" DROP CONSTRAINT "FK_73b5f990ec5d75b3fd2eb2dd0dc"`);
    await queryRunner.query(`DROP INDEX "IDX_caf83dbef4196e0979cba098f9" ON "dbo"."staking"`);
    await queryRunner.query(`ALTER TABLE "dbo"."staking" DROP CONSTRAINT "DF_453d51a0e273da9c09171581e27"`);
    await queryRunner.query(`ALTER TABLE "dbo"."staking" DROP COLUMN "blockchain"`);
    await queryRunner.query(
      `ALTER TABLE "dbo"."staking" ADD "stageTwoBalance" float NOT NULL CONSTRAINT "DF_e33ed9712d5705d569755afff7d" DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "dbo"."staking" ADD "stageOneBalance" float NOT NULL CONSTRAINT "DF_2da628d68dc2fb24e382ac941b9" DEFAULT 0`,
    );
    await queryRunner.query(`ALTER TABLE "dbo"."staking" ADD "assetId" int`);
    await queryRunner.query(
      `ALTER TABLE "dbo"."staking" ADD "balance" float NOT NULL CONSTRAINT "DF_73123fbb52548e2f205c1739f22" DEFAULT 0`,
    );
    await queryRunner.query(
      `UPDATE s SET s.assetId = b.assetId, s.balance = b.balance, s.stageOneBalance = b.stageOneBalance, s.stageTwoBalance = b.stageTwoBalance FROM "dbo"."staking" s INNER JOIN "dbo"."staking_balance" b ON b.stakingId = s.id`,
    );
    await queryRunner.query(`ALTER TABLE "dbo"."staking" ALTER COLUMN "assetId" int NOT NULL`);
    await queryRunner.query(`DROP INDEX "IDX_a023e936b304b5118b75c99dbd" ON "staking_balance"`);
    await queryRunner.query(`DROP TABLE "staking_balance"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_9082f014464892da67c25f74d8" ON "dbo"."staking" ("userId", "strategy", "assetId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "dbo"."staking" ADD CONSTRAINT "FK_9d5dbacb7704b48178b2953cd8f" FOREIGN KEY ("assetId") REFERENCES "asset"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
};
