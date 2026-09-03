import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from '../auth.service';
import { SecurityLogService } from '../../security-log/security-log.service';

@Injectable()
export class StepUpGuard implements CanActivate {
    constructor(
        private readonly authService: AuthService,
        private readonly securityLog: SecurityLogService,
    ) { }

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

        const code = String(req.header('x-2fa-code') ?? '').trim();
        if (!code) {
            throw new UnauthorizedException('Thao tác này cần mã xác thực 2FA');
        }

        const ok = await this.authService.verifyTwoFactor(userId, code);
        if (!ok) {
            await this.securityLog.record({
                event: 'stepup_failed',
                userId,
                ip: req.ip,
                userAgent: req.header('user-agent') ?? null,
                context: { action: 'credential_delete' },
            });
            throw new UnauthorizedException('Mã 2FA không đúng');
        }
        return true;
    }
}