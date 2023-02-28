const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class addIpLogger1677265237279 {
    name = 'addIpLogger1677265237279'

    async up(queryRunner) {
        await queryRunner.query(`CREATE TABLE "ip_log" ("id" int NOT NULL IDENTITY(1,1), "updated" datetime2 NOT NULL CONSTRAINT "DF_27106482bf65a8f1504a34ad03f" DEFAULT getdate(), "created" datetime2 NOT NULL CONSTRAINT "DF_acd9763921d8b674baaaa01ca41" DEFAULT getdate(), "address" nvarchar(255) NOT NULL, "ip" nvarchar(255) NOT NULL, "country" nvarchar(255), "url" nvarchar(255) NOT NULL, "result" bit NOT NULL, CONSTRAINT "PK_fa57c5c3d53da1f802990bac510" PRIMARY KEY ("id"))`);
    }

    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE "ip_log"`);
    }
}
