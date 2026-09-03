import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1788246862943 implements MigrationInterface {
    name = 'Init1788246862943'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
        await queryRunner.query(`CREATE TABLE "credentials" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "ciphertext" character varying NOT NULL, "iv" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_1e38bc43be6697cdda548ad27a6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_44a0bfeebcef2130744ad720fc" ON "credentials"  ("userId", "updatedAt") `);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "email" character varying NOT NULL, "authHash" character varying NOT NULL, "kdfSalt" character varying NOT NULL, "kdfIterations" integer NOT NULL DEFAULT '600000', "verifier" character varying NOT NULL, "role" character varying NOT NULL DEFAULT 'user', "totpSecret" text, "totpEnabled" boolean NOT NULL DEFAULT false, "backupCodes" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "security_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid, "event" character varying NOT NULL, "ipAddress" text, "userAgent" text, "context" jsonb, "prevHash" text, "hash" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_48ce9a9a3215af82611525ce08b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "credentials" ADD CONSTRAINT "FK_8d3a07b8e994962efe57ebd0f20" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "security_logs" ADD CONSTRAINT "FK_ecc5c835f3afc158bade1f2134a" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "security_logs" DROP CONSTRAINT "FK_ecc5c835f3afc158bade1f2134a"`);
        await queryRunner.query(`ALTER TABLE "credentials" DROP CONSTRAINT "FK_8d3a07b8e994962efe57ebd0f20"`);
        await queryRunner.query(`DROP TABLE "security_logs"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_44a0bfeebcef2130744ad720fc"`);
        await queryRunner.query(`DROP TABLE "credentials"`);
    }

}
