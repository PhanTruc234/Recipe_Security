import { Body, Controller, Headers, Ip, Post, Session, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { SessionData } from 'express-session';
import { VaultGuard } from '../auth/guards/vault.guard';
import { SecurityLogService } from '../security-log/security-log.service';
import { UrlrepService } from './urlrep.service';
import { ReputationDto } from './dto/reputation.dto';

@UseGuards(VaultGuard)
@Controller('url')
export class UrlrepController {
  constructor(
    private readonly urlrep: UrlrepService,
    private readonly securityLog: SecurityLogService,
  ) { }

  @Throttle({ default: { limit: 15, ttl: 60000 } })
  @Post('reputation')
  async reputation(
    @Body() dto: ReputationDto,
    @Session() session: SessionData,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    if (!this.urlrep.anyProviderConfigured()) {
      return { configured: false, message: 'Server chưa cấu hình API key Safe Browsing/VirusTotal' };
    }
    const domain = new URL(dto.url).hostname;
    const result = await this.urlrep.checkReputation(dto.url, domain);
    await this.securityLog.record({
      event: 'url_reputation_checked', userId: session.userId, ip, userAgent,
      context: { level: result.level },
    });
    return { configured: true, ...result };
  }
}