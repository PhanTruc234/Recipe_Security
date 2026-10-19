import 'reflect-metadata';
import 'dotenv/config';
import { DataSource } from 'typeorm';

const useSsl =
  process.env.DATABASE_SSL === 'true' ||
  (process.env.DATABASE_URL?.includes('sslmode=require') ?? false);

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
  logging: true,
  ...(useSsl
    ? {
        ssl: {
          rejectUnauthorized:
            process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false',
        },
      }
    : {}),
});
