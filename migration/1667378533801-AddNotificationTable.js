const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class AddNotificationTable1667378533801 {
    name = 'AddNotificationTable1667378533801'

    async up(queryRunner) {
        await queryRunner.query(`CREATE TABLE "sqldb-lock-api-dev".."notification" ("id" int NOT NULL IDENTITY(1,1), "updated" datetime2 NOT NULL CONSTRAINT "DF_e3d9266f1a6d4cf00832ae607c3" DEFAULT getdate(), "created" datetime2 NOT NULL CONSTRAINT "DF_af7e45ec51e6aff202fbb030ecd" DEFAULT getdate(), "type" nvarchar(255) NOT NULL, "context" nvarchar(255) NOT NULL, "correlationId" nvarchar(255) NOT NULL, "sendDate" datetime2 NOT NULL, "suppressRecurring" bit NOT NULL CONSTRAINT "DF_830adad2aae5ed9e956909141fb" DEFAULT 0, "debounce" float, CONSTRAINT "PK_705b6c7cdf9b2c2ff7ac7872cb7" PRIMARY KEY ("id"))`);
    }

    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE "sqldb-lock-api-dev".."notification"`);
    }
}
