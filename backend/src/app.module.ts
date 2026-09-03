import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CredentialModule } from './credential/credential.module';
import { SecurityLogModule } from './security-log/security-log.module';
import { AdminModule } from './admin/admin.module';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { RecipeModule } from './recipe/recipe.module';
import { UrlrepModule } from './urlrep/urlrep.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: "postgres",
        url: config.get<string>('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: false,
        ssl: { rejectUnauthorized: false },
      })
    }),
    ThrottlerModule.forRoot([
      { ttl: 60000, limit: 100 }, // mặc định: 100 request / 60 giây / IP
    ]),
    AuthModule,
    CredentialModule,
    SecurityLogModule,
    AdminModule,
    RecipeModule,
    UrlrepModule
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],

})
export class AppModule { }
