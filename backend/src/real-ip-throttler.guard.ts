import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';
import { extractClientIp } from './client-ip.decorator';

// @nestjs/throttler mặc định đếm theo req.ip. Nhưng sau chuỗi proxy
// (Vercel -> Cloudflare -> Render), req.ip là IP của PROXY — dùng chung cho mọi
// user -> rate-limit bị gộp chung, không tách được từng client.
// Guard này đếm theo IP CLIENT THẬT (giống @ClientIp / env CLIENT_IP_HEADER).
@Injectable()
export class RealIpThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, any>): Promise<string> {
    return Promise.resolve(extractClientIp(req as unknown as Request));
  }
}
