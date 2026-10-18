import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/auth.entity';
import { AuthLockout } from './entities/auth-lockout.entity';
import { SecurityLogModule } from 'src/security-log/security-log.module';
import { TotpService } from './totp.service';
import { CryptoService } from './crypto.service';
import { DeviceService } from './device.service';
import { LoginThrottleService } from './login-throttle.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, AuthLockout]), SecurityLogModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    TotpService,
    CryptoService,
    DeviceService,
    LoginThrottleService,
  ],
  exports: [AuthService, LoginThrottleService],
})
export class AuthModule {}
