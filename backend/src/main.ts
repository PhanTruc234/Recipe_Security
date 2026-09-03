import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import session from 'express-session';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import connectPgSimple from 'connect-pg-simple';
import { Pool } from 'pg';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  const PgSession = connectPgSimple(session);
  const sessionPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  app.use(
    session({
      store: new PgSession({
        pool: sessionPool,
        tableName: 'session',
        createTableIfMissing: true,
      }),
      name: "recipe.sid",
      secret: process.env.SESSION_SECRET as string,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 1000
      }
    })
  )
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    })
  )
  app.enableCors({
    origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
    credentials: true,
  });
  app.setGlobalPrefix('api');
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
