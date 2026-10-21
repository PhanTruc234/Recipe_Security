import { MigrationInterface, QueryRunner } from 'typeorm';

export class PinUnlock1820000000000 implements MigrationInterface {
  name = 'PinUnlock1820000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD "pinVerifier" text`);
    await queryRunner.query(`ALTER TABLE "users" ADD "pinShare" text`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD "pinFails" integer NOT NULL DEFAULT 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "pinFails"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "pinShare"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "pinVerifier"`);
  }
}
