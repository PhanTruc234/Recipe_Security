import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  Res,
  Session,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ClientIp, ipDebugHeaders } from 'src/client-ip.decorator';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { SessionData } from 'express-session';
import { SessionAuthGuard } from './guards/session-auth.guard';
import { StepUpGuard } from './guards/step-up.guard';
import { SecurityLogService } from 'src/security-log/security-log.service';
import { Throttle } from '@nestjs/throttler';
import { TotpService } from './totp.service';
import * as QRCode from 'qrcode';
import { CodeDto } from './dto/code.dto';
import { LabelDto } from './dto/label.dto';
import { randomBytes } from 'crypto';
import { DeviceService } from './device.service';
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly securityLog: SecurityLogService,
    private readonly totp: TotpService,
    private readonly deviceService: DeviceService,
  ) {}

  private regenerate(req: Request): Promise<void> {
    return new Promise((resolve, reject) =>
      // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
      req.session.regenerate((err) => (err ? reject(err) : resolve())),
    );
  }

  private establishSession(
    req: Request,
    userId: string,
    role: string,
    ip: string | null,
    userAgent: string | null,
  ) {
    req.session.userId = userId;
    req.session.role = role;
    req.session.vaultGate = 'real';
    req.session.vaultLastActivity = Math.floor(Date.now() / 1000);
    const now = new Date().toISOString();
    req.session.device = {
      deviceId: randomBytes(16).toString('hex'),
      ip,
      userAgent,
      createdAt: now,
      lastSeen: now,
    };
  }

  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Session() session: SessionData,
    @ClientIp() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const { id, ...bundle } = await this.authService.register(dto);
    await this.regenerate(req);
    this.establishSession(req, id, bundle.role, ip ?? null, userAgent ?? null);
    await this.securityLog.record({
      event: 'account_created',
      userId: id,
      ip,
      userAgent,
    });
    return bundle;
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  async login(
    @Req() req: Request,
    @Body() dto: LoginDto,
    @Session() session: SessionData,
    @ClientIp() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const result = await this.authService.login(dto).catch(async (e) => {
      // A2: ghi nhật ký đăng nhập sai (không kèm email -> chống dò)
      await this.securityLog.record({ event: 'login_failed', ip, userAgent });
      throw e;
    });

    if (result.totpEnabled) {
      session.pending2fa = {
        userId: result.id,
        role: result.role,
        ts: Date.now(),
      };
      return { twofa: true };
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, totpEnabled: _te, ...bundle } = result;
    // A1: kiểm thiết bị lạ TRƯỚC khi ghi login_success của chính lần này
    const newDevice = await this.securityLog.isNewDevice(
      id,
      ip ?? null,
      userAgent ?? null,
    );
    await this.regenerate(req);
    this.establishSession(req, id, bundle.role, ip ?? null, userAgent ?? null);
    await this.securityLog.record({
      event: 'login_success',
      userId: id,
      ip,
      userAgent,
    });
    if (newDevice) {
      req.session.newDeviceAlert = {
        at: new Date().toISOString(),
        ip: ip ?? null,
        userAgent: userAgent ?? null,
      };
      await this.securityLog.record({
        event: 'new_device_login',
        userId: id,
        ip,
        userAgent,
      });
    }
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
      newDeviceAlert: session.newDeviceAlert ?? null,
    };
  }

  @UseGuards(SessionAuthGuard)
  @Post('alert/dismiss')
  dismissAlert(@Session() session: SessionData) {
    session.newDeviceAlert = undefined;
    return { ok: true };
  }

  @UseGuards(SessionAuthGuard)
  @Get('keys')
  async keys(@Session() session: SessionData) {
    const user = await this.authService.findById(session.userId);
    if (!user) {
      throw new UnauthorizedException('Chưa đăng nhập');
    }
    session.vaultLastActivity = Math.floor(Date.now() / 1000);
    return {
      verifier: user.verifier,
      kdfSalt: user.kdfSalt,
    };
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
    @ClientIp() ip: string,
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
    const user = await this.authService.findById(session.userId);
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
    @ClientIp() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const secret = session.pendingTotpSecret;
    if (!secret) {
      throw new BadRequestException('Chưa bắt đầu thiết lập 2FA');
    }
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    if (!this.totp.verify(dto.code, secret)) {
      throw new UnauthorizedException('Mã 2FA không đúng');
    }
    const backupCodes = await this.authService.enableTotp(
      session.userId,
      secret,
    );
    session.pendingTotpSecret = undefined;
    await this.securityLog.record({
      event: '2fa_enabled',
      userId: session.userId,
      ip,
      userAgent,
    });
    return { backupCodes };
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('2fa/verify')
  async verify2fa(
    @Req() req: Request,
    @Body() dto: CodeDto,
    @Session() session: SessionData,
    @ClientIp() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const pending = session.pending2fa;
    if (!pending || Date.now() - pending.ts > 5 * 60 * 1000) {
      session.pending2fa = undefined;
      throw new UnauthorizedException('Phiên xác thực 2 lớp đã hết hạn');
    }

    const bundle = await this.authService.verifyTwoFactor(
      pending.userId,
      dto.code,
    );
    if (!bundle) {
      throw new UnauthorizedException('Mã 2FA không đúng');
    }
    const newDevice = await this.securityLog.isNewDevice(
      pending.userId,
      ip ?? null,
      userAgent ?? null,
    );
    await this.regenerate(req);
    this.establishSession(
      req,
      pending.userId,
      pending.role,
      ip ?? null,
      userAgent ?? null,
    );
    await this.securityLog.record({
      event: 'login_success',
      userId: pending.userId,
      ip,
      userAgent,
      context: { via: '2fa' },
    });
    if (newDevice) {
      req.session.newDeviceAlert = {
        at: new Date().toISOString(),
        ip: ip ?? null,
        userAgent: userAgent ?? null,
      };
      await this.securityLog.record({
        event: 'new_device_login',
        userId: pending.userId,
        ip,
        userAgent,
      });
    }
    return bundle;
  }

  @UseGuards(SessionAuthGuard)
  @Get('2fa/status')
  async status2fa(@Session() session: SessionData) {
    const user = await this.authService.findById(session.userId);
    return { enabled: !!user?.totpEnabled };
  }

  @UseGuards(SessionAuthGuard)
  @Post('2fa/disable')
  async disable2fa(
    @Session() session: SessionData,
    @Body() dto: CodeDto,
    @ClientIp() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const user = await this.authService.findById(session.userId);
    if (!user) {
      throw new UnauthorizedException('Chưa đăng nhập');
    }
    if (!user.totpEnabled) {
      throw new BadRequestException('2FA chưa được bật');
    }
    const ok = await this.authService.verifyTwoFactor(session.userId, dto.code);
    if (!ok) {
      throw new UnauthorizedException('Mã 2FA không đúng');
    }

    await this.authService.disableTotp(session.userId);
    await this.securityLog.record({
      event: '2fa_disabled',
      userId: session.userId,
      ip,
      userAgent,
    });
    return { ok: true };
  }

  @UseGuards(SessionAuthGuard)
  @Get('sessions')
  listSessions(@Session() session: SessionData) {
    return this.deviceService.listForUser(
      session.userId,
      session.device?.deviceId,
    );
  }

  @UseGuards(StepUpGuard)
  @Post('sessions/:deviceId/revoke')
  async revokeSession(
    @Param('deviceId') deviceId: string,
    @Session() session: SessionData,
    @ClientIp() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    if (deviceId === session.device?.deviceId) {
      throw new BadRequestException(
        'Đây là thiết bị hiện tại — dùng Đăng xuất',
      );
    }
    const ok = await this.deviceService.revoke(session.userId, deviceId);
    if (!ok) {
      throw new NotFoundException('Không tìm thấy thiết bị');
    }
    await this.securityLog.record({
      event: 'session_revoked',
      userId: session.userId,
      ip,
      userAgent,
      context: { deviceId },
    });
    return { ok: true };
  }

  @UseGuards(SessionAuthGuard)
  @Post('sessions/:deviceId/label')
  async renameSession(
    @Param('deviceId') deviceId: string,
    @Body() dto: LabelDto,
    @Session() session: SessionData,
  ) {
    const label = dto.label.trim();
    const ok = await this.deviceService.rename(session.userId, deviceId, label);
    if (!ok) {
      throw new NotFoundException('Không tìm thấy thiết bị');
    }
    if (session.device?.deviceId === deviceId) {
      session.device.label = label;
    }
    return { ok: true };
  }

  @UseGuards(SessionAuthGuard)
  @Get('ip-debug')
  ipDebug(@Req() req: Request) {
    return ipDebugHeaders(req);
  }
}
