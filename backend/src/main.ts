import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import session from 'express-session';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import connectPgSimple from 'connect-pg-simple';
import { Pool } from 'pg';
import { csrfProtection } from './csrf.middleware';
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const trustProxy = process.env.TRUST_PROXY;
  app.set(
    'trust proxy',
    trustProxy === undefined
      ? false
      : /^\d+$/.test(trustProxy)
        ? Number(trustProxy)
        : trustProxy,
  );
  app.use(helmet());
  const PgSession = connectPgSimple(session);
  const sessionPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: true },
  });

  app.use(
    session({
      store: new PgSession({
        pool: sessionPool,
        tableName: 'session',
        createTableIfMissing: true,
      }),
      name: 'recipe.sid',
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 1000,
      },
    }),
  );
  app.use(csrfProtection);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  // Origin localhost chỉ dùng khi dev; production chỉ nhận CLIENT_ORIGIN
  const devOrigins =
    process.env.NODE_ENV === 'production'
      ? []
      : [
        'http://localhost:3001',
        'http://localhost:3000',
        'http://localhost:5173',
      ];
  const allowedOrigins = [process.env.CLIENT_ORIGIN, ...devOrigins].filter(
    (o): o is string => !!o,
  );

  app.enableCors({
    origin: (origin, callback) => {
      callback(null, !origin || allowedOrigins.includes(origin));
    },
    credentials: true,
  });
  app.setGlobalPrefix('api');
  const port = process.env.PORT ?? 5000;
  await app.listen(port);
}
void bootstrap();
