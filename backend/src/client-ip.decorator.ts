import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export function extractClientIp(req: Request): string {
  const cf = req.headers['cf-connecting-ip'];
  const fromCf = (Array.isArray(cf) ? cf[0] : cf)?.trim();
  const ip = fromCf || req.ip || '';
  return ip.replace(/^::ffff:/, '');
}

export const ClientIp = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string =>
    extractClientIp(ctx.switchToHttp().getRequest<Request>()),
);
