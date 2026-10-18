import {
  CanActivate,
  ExecutionContext,
  HttpException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from '../auth.service';
import { SecurityLogService } from '../../security-log/security-log.service';
import { extractClientIp } from '../../client-ip.decorator';
import { LoginThrottleService } from '../login-throttle.service';

@Injectable()
export class StepUpGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly securityLog: SecurityLogService,
    private readonly loginThrottle: LoginThrottleService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const userId = req.session?.userId;
    if (!userId) {
      throw new UnauthorizedException('Chưa đăng nhập');
    }

    const user = await this.authService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Chưa đăng nhập');
    }
    if (!user.totpEnabled || !user.totpSecret) return true;

    const tkey = `2fa:${userId}`;
    const locked = this.loginThrottle.lockedSeconds(tkey);
    if (locked > 0) {
      throw new HttpException(
        {
          statusCode: 429,
          message: `Nhập 2FA sai quá nhiều, thử lại sau ${locked} giây.`,
          retryAfter: locked,
        },
        429,
      );
    }

    const code = String(req.header('x-2fa-code') ?? '').trim();
    if (!code) {
      throw new UnauthorizedException('Thao tác này cần mã xác thực 2FA');
    }

    const ok = await this.authService.verifyTwoFactor(userId, code);
    if (!ok) {
      this.loginThrottle.recordFailure(tkey);
      await this.securityLog.record({
        event: 'stepup_failed',
        userId,
        ip: extractClientIp(req),
        userAgent: req.header('user-agent') ?? null,
        context: { action: 'credential_delete' },
      });
      const remain = this.loginThrottle.lockedSeconds(tkey);
      if (remain > 0) {
        throw new HttpException(
          {
            statusCode: 429,
            message: `Nhập 2FA sai quá nhiều, thử lại sau ${remain} giây.`,
            retryAfter: remain,
          },
          429,
        );
      }
      throw new UnauthorizedException('Mã 2FA không đúng');
    }
    this.loginThrottle.reset(tkey);
    return true;
  }
}
