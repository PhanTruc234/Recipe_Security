import { MigrationInterface, QueryRunner } from 'typeorm';

export class TotpLastStep1810000000000 implements MigrationInterface {
  name = 'TotpLastStep1810000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD "totpLastStep" integer`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "totpLastStep"`);
  }
}
