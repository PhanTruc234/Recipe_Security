import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

const OVERRIDE = process.env.CLIENT_IP_HEADER?.toLowerCase();

function firstHeader(req: Request, name: string): string {
  const v = req.headers[name];
  const s = Array.isArray(v) ? v[0] : v;
  return (s ?? '').split(',')[0].trim();
}

export function extractClientIp(req: Request): string {
  const ip = OVERRIDE ? firstHeader(req, OVERRIDE) : (req.ip ?? '');
  return ip.replace(/^::ffff:/, '');
}

export function ipDebugHeaders(req: Request): Record<string, string | null> {
  const names = [
    'cf-connecting-ip',
    'true-client-ip',
    'x-vercel-forwarded-for',
    'x-real-ip',
    'x-forwarded-for',
  ];
  const out: Record<string, string | null> = {};
  for (const n of names) {
    const v = req.headers[n];
    out[n] = (Array.isArray(v) ? v[0] : v) ?? null;
  }
  out['req.ip'] = req.ip ?? null;
  out['=> resolved'] = extractClientIp(req);
  return out;
}

export const ClientIp = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string =>
    extractClientIp(ctx.switchToHttp().getRequest<Request>()),
);
