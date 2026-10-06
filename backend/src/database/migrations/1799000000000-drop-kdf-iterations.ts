import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropKdfIterations1799000000000 implements MigrationInterface {
    name = 'DropKdfIterations1799000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Tài khoản cũ tạo bằng PBKDF2 không còn giải mã được -> xoá
        await queryRunner.query(`TRUNCATE TABLE "users" CASCADE`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "kdfIterations"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "users" ADD "kdfIterations" integer NOT NULL DEFAULT 600000`,
        );
    }
}