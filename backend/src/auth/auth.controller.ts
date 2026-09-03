import { BadRequestException, Body, Controller, Get, Headers, Ip, Post, Query, Req, Res, Session, UnauthorizedException, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { SessionData } from 'express-session';
import { SessionAuthGuard } from './guards/session-auth.guard';
import { SecurityLogService } from 'src/security-log/security-log.service';
import { Throttle } from '@nestjs/throttler';
import { TotpService } from './totp.service';
import * as QRCode from 'qrcode';
import { CodeDto } from './dto/code.dto';
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly securityLog: SecurityLogService,
    private readonly totp: TotpService
  ) { }

  private regenerate(req: Request): Promise<void> {
    return new Promise((resolve, reject) =>
      req.session.regenerate((err) => (err ? reject(err) : resolve())),
    );
  }

  private establishSession(req: Request, userId: string, role: string) {
    req.session.userId = userId;
    req.session.role = role;
    req.session.vaultGate = 'real';
    req.session.vaultLastActivity = Math.floor(Date.now() / 1000);
  }

  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Session() session: SessionData,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const { id, ...bundle } = await this.authService.register(dto);
    await this.regenerate(req);
    this.establishSession(req, id, bundle.role);
    await this.securityLog.record({ event: 'account_created', userId: id, ip, userAgent });
    return bundle;
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  async login(
    @Req() req: Request,
    @Body() dto: LoginDto,
    @Session() session: SessionData,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const result = await this.authService.login(dto);

    if (result.totpEnabled) {
      session.pending2fa = {
        userId: result.id,
        role: result.role,
        ts: Date.now()
      };
      return { twofa: true };
    }

    const { id, totpEnabled: _te, ...bundle } = result;
    await this.regenerate(req);
    this.establishSession(req, id, bundle.role);
    await this.securityLog.record({ event: 'login_success', userId: id, ip, userAgent });
    return bundle;
  }

  @Get('me')
  me(@Session() session: SessionData) {
    return {
      authenticated: !!session.userId,
      userId: session.userId ?? null,
      role: session.role ?? null,
      vaultGate: session.vaultGate ?? null,
      fakeUnlocked: !!session.fakeUnlocked,
      pending2fa: !!session.pending2fa,
      newDeviceAlert: null,
    };
  }

  @UseGuards(SessionAuthGuard)
  @Get('keys')
  async keys(@Session() session: SessionData) {
    const user = await this.authService.findById(session.userId!);
    if (!user) {
      throw new UnauthorizedException('Chưa đăng nhập');
    }
    session.vaultLastActivity = Math.floor(Date.now() / 1000);
    return { verifier: user.verifier, kdfSalt: user.kdfSalt, kdfIterations: user.kdfIterations };
  }

  @Get('kdf-params')
  kdfParams(@Query('email') email: string) {
    return this.authService.getKdfParams(email ?? '');
  }

  @UseGuards(SessionAuthGuard)
  @Get('profile')
  profile(@Session() session: SessionData) {
    return { userId: session.userId, role: session.role };
  }

  @Post('logout')
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const userId = req.session.userId ?? null;
    await new Promise<void>((resolve) => req.session.destroy(() => resolve()));
    res.clearCookie('recipe.sid');
    await this.securityLog.record({ event: 'logout', userId, ip, userAgent });
    return { ok: true };
  }

  @UseGuards(SessionAuthGuard)
  @Post('2fa/setup')
  async setup2fa(@Session() session: SessionData) {
    const user = await this.authService.findById(session.userId!);
    if (!user) {
      throw new UnauthorizedException('Chưa đăng nhập');
    }

    const secret = this.totp.generateSecret();
    session.pendingTotpSecret = secret;
    const qr = await QRCode.toDataURL(this.totp.keyuri(user.email, secret));
    return { secret, qr };
  }

  @UseGuards(SessionAuthGuard)
  @Post('2fa/enable')
  async enable2fa(
    @Session() session: SessionData,
    @Body() dto: CodeDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const secret = session.pendingTotpSecret;
    if (!secret) {
      throw new BadRequestException('Chưa bắt đầu thiết lập 2FA');
    }
    if (!this.totp.verify(dto.code, secret)) {
      throw new UnauthorizedException('Mã 2FA không đúng');
    }
    const backupCodes = await this.authService.enableTotp(session.userId!, secret);
    session.pendingTotpSecret = undefined;
    await this.securityLog.record({ event: '2fa_enabled', userId: session.userId, ip, userAgent });
    return { backupCodes };
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('2fa/verify')
  async verify2fa(
    @Req() req: Request,
    @Body() dto: CodeDto,
    @Session() session: SessionData,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const pending = session.pending2fa;
    if (!pending || Date.now() - pending.ts > 5 * 60 * 1000) {
      session.pending2fa = undefined;
      throw new UnauthorizedException('Phiên xác thực 2 lớp đã hết hạn');
    }

    const bundle = await this.authService.verifyTwoFactor(pending.userId, dto.code);
    if (!bundle) {
      throw new UnauthorizedException('Mã 2FA không đúng');
    }
    await this.regenerate(req);
    this.establishSession(req, pending.userId, pending.role);
    await this.securityLog.record({ event: 'login_success', userId: pending.userId, ip, userAgent, context: { via: '2fa' } });
    return bundle;
  }

  @UseGuards(SessionAuthGuard)
  @Get('2fa/status')
  async status2fa(@Session() session: SessionData) {
    const user = await this.authService.findById(session.userId!);
    return { enabled: !!user?.totpEnabled };
  }

  @UseGuards(SessionAuthGuard)
  @Post('2fa/disable')
  async disable2fa(
    @Session() session: SessionData,
    @Body() dto: CodeDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const user = await this.authService.findById(session.userId!);
    if (!user) {
      throw new UnauthorizedException('Chưa đăng nhập');
    }
    if (!user.totpEnabled) {
      throw new BadRequestException('2FA chưa được bật');
    }
    const ok = await this.authService.verifyTwoFactor(session.userId!, dto.code);
    if (!ok) {
      throw new UnauthorizedException('Mã 2FA không đúng');
    }

    await this.authService.disableTotp(session.userId!);
    await this.securityLog.record({ event: '2fa_disabled', userId: session.userId, ip, userAgent });
    return { ok: true };
  }
}