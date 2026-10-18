import { MigrationInterface, QueryRunner } from 'typeorm';

export class AuthLockouts1800000000000 implements MigrationInterface {
  name = 'AuthLockouts1800000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "auth_lockouts" (
        "key" character varying NOT NULL,
        "fails" integer NOT NULL DEFAULT 0,
        "lockedUntil" TIMESTAMP WITH TIME ZONE,
        "lastFailAt" TIMESTAMP WITH TIME ZONE,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_auth_lockouts" PRIMARY KEY ("key")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "auth_lockouts"`);
  }
}
