import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/auth.entity';
import { SecurityLogModule } from 'src/security-log/security-log.module';
import { TotpService } from './totp.service';
import { CryptoService } from './crypto.service';

@Module({
  imports: [TypeOrmModule.forFeature([User]), SecurityLogModule],
  controllers: [AuthController],
  providers: [AuthService, TotpService, CryptoService],
  exports: [AuthService],
})
export class AuthModule { }
