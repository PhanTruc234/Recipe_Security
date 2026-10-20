import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Request } from 'express';
import type { SessionData } from 'express-session';

// Cổng mở bằng câu bí mật ở ô tìm món chỉ sống 10 phút (đủ gõ mật khẩu + chạy Argon2)
export const GATE_TTL_MS = 10 * 60 * 1000;

export function isGateOpen(s: Partial<SessionData> | undefined): boolean {
  if (s?.vaultGate !== 'real') return false;
  if (s.userId) return true; // đã đăng nhập: cổng gắn với phiên
  return (s.vaultGateUntil ?? 0) > Date.now();
}

// Chưa qua cổng -> giả làm route không tồn tại (giống hệt 404 mặc định của Nest),
// người ngoài gọi thẳng API cũng không biết có chức năng đăng nhập.
@Injectable()
export class GateGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    if (!isGateOpen(req.session)) {
      throw new NotFoundException(
        `Cannot ${req.method} ${req.originalUrl.split('?')[0]}`,
      );
    }
    return true;
  }
}
