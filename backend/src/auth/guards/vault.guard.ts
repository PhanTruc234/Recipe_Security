import {
    CanActivate,
    ExecutionContext,
    HttpException,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class VaultGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const req = context.switchToHttp().getRequest<Request>();
        const session = req.session;
        const autoLockSeconds = Number(process.env.AUTO_LOCK_SECONDS) || 300;
        if (!session?.userId) {
            throw new UnauthorizedException('Chưa đăng nhập');
        }
        if (session.vaultGate !== 'real') {
            throw new UnauthorizedException('Cổng kho chưa được mở');
        }
        const now = Math.floor(Date.now() / 1000);
        const last = session.vaultLastActivity ?? 0;
        if (now - last > autoLockSeconds) {
            throw new HttpException('Kho đã tự khóa, mở lại cổng', 440);
        }
        session.vaultLastActivity = now;
        return true;
    }
}