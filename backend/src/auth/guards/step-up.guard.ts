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

// Thao tác không hồi lại được (xóa mục, thu hồi thiết bị) cần chứng minh lại danh tính:
// - đã bật 2FA   -> mã 2FA mới ở header x-2fa-code
// - chưa bật 2FA -> authHash dẫn xuất lại từ mật khẩu chủ ở body.reauth
//   (body thay vì header: proxy hay ghi log header)
@Injectable()
export class StepUpGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly securityLog: SecurityLogService,
    private readonly loginThrottle: LoginThrottleService,
  ) {}

  private lockedError(seconds: number, use2fa: boolean) {
    return new HttpException(
      {
        statusCode: 429,
        message: `${use2fa ? 'Nhập 2FA' : 'Nhập mật khẩu'} sai quá nhiều, thử lại sau ${seconds} giây.`,
        retryAfter: seconds,
      },
      429,
    );
  }

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

    const use2fa = user.totpEnabled && !!user.totpSecret;
    const tkey = use2fa ? `2fa:${userId}` : `reauth:${userId}`;
    const locked = await this.loginThrottle.lockedSeconds(tkey);
    if (locked > 0) throw this.lockedError(locked, use2fa);

    let ok: boolean;
    if (use2fa) {
      const code = String(req.header('x-2fa-code') ?? '').trim();
      if (!code) {
        throw new UnauthorizedException('Thao tác này cần mã xác thực 2FA');
      }
      ok = !!(await this.authService.verifyTwoFactor(userId, code));
    } else {
      const raw = (req.body as { reauth?: unknown } | undefined)?.reauth;
      const proof = typeof raw === 'string' ? raw : '';
      if (!proof) {
        throw new UnauthorizedException('Thao tác này cần nhập lại mật khẩu');
      }
      ok = await this.authService.verifyAuthHash(user, proof);
    }

    if (!ok) {
      await this.loginThrottle.recordFailure(tkey);
      const route = (req.route as { path?: string } | undefined)?.path;
      await this.securityLog.record({
        event: 'stepup_failed',
        userId,
        ip: extractClientIp(req),
        userAgent: req.header('user-agent') ?? null,
        context: {
          action: `${req.method} ${route ?? req.path}`,
          method: use2fa ? '2fa' : 'password',
        },
      });
      const remain = await this.loginThrottle.lockedSeconds(tkey);
      if (remain > 0) throw this.lockedError(remain, use2fa);
      throw new UnauthorizedException(
        use2fa ? 'Mã 2FA không đúng' : 'Mật khẩu không đúng',
      );
    }
    await this.loginThrottle.reset(tkey);
    return true;
  }
}
