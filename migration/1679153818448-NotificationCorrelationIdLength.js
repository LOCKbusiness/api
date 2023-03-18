const { MigrationInterface, QueryRunner } = require('typeorm');

module.exports = class NotificationCorrelationIdLength1679153818448 {
  name = 'NotificationCorrelationIdLength1679153818448';

  async up(queryRunner) {
    await queryRunner.query(`ALTER TABLE "dbo"."notification" ALTER COLUMN "correlationId" nvarchar(MAX) NOT NULL`);
  }

  async down(queryRunner) {
    await queryRunner.query(`ALTER TABLE "dbo"."notification" ALTER COLUMN "correlationId" nvarchar(1023) NOT NULL`);
  }
};
