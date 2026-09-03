import 'reflect-metadata';
import 'dotenv/config';
import { DataSource, DataSourceOptions } from "typeorm";

export default new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    entities: ['src/**/*.entity.ts'],
    migrations: ['src/database/migrations/*.ts'],
    synchronize: false,
    logging: true,
    ssl: { rejectUnauthorized: false },
});