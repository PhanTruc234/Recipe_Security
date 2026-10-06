import { randomBytes, timingSafeEqual } from 'crypto';
import type { Request, Response, NextFunction } from 'express';

const COOKIE_NAME = 'XSRF-TOKEN';
const HEADER_NAME = 'x-xsrf-token';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function readCookie(req: Request, name: string): string | undefined {
  const raw = req.headers.cookie;
  if (!raw) {
    return undefined;
  }
  for (const part of raw.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) {
      continue;
    }
    const key = part.slice(0, idx).trim();
    if (key === name) {
      return decodeURIComponent(part.slice(idx + 1).trim());
    }
  }
  return undefined;
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function csrfProtection(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  let token = readCookie(req, COOKIE_NAME);
  if (!token) {
    token = randomBytes(32).toString('hex');
    res.cookie(COOKIE_NAME, token, {
      httpOnly: false,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });
  }

  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  const header = req.get(HEADER_NAME);
  if (!header || !safeEqual(header, token)) {
    res
      .status(403)
      .json({ statusCode: 403, message: 'CSRF token không hợp lệ' });
    return;
  }
  return next();
}
