import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class AdminGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const req = context.switchToHttp().getRequest<Request>();
        if (!req.session?.userId) {
            throw new UnauthorizedException('Chưa đăng nhập');
        }
        if (req.session.role !== 'admin') {
            throw new ForbiddenException('Cần quyền quản trị');
        }
        return true;
    }
}