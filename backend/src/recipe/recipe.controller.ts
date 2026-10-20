import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Session,
  UnauthorizedException,
} from '@nestjs/common';
import { ClientIp } from 'src/client-ip.decorator';
import { Throttle } from '@nestjs/throttler';
import { SessionData } from 'express-session';
import { RecipeService } from './recipe.service';
import { SearchDto } from './dto/search.dto';
import { GATE_TTL_MS } from 'src/auth/guards/gate.guard';

@Controller('recipe')
export class RecipeController {
  constructor(private readonly recipeService: RecipeService) {}

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('search')
  async search(
    @Body() dto: SearchDto,
    @Session() session: SessionData,
    @ClientIp() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const result = await this.recipeService.search(dto.query, {
      ip,
      userAgent,
    });
    if ('unlocked' in result) {
      if (result.unlocked === 'real') {
        session.vaultGate = 'real';
        session.vaultGateUntil = Date.now() + GATE_TTL_MS;
        session.vaultLastActivity = Math.floor(Date.now() / 1000);
      } else {
        session.fakeUnlocked = true;
        // Bị ép mở kho mồi -> đóng luôn cổng thật còn mở trên trình duyệt này
        if (!session.userId) {
          session.vaultGate = undefined;
          session.vaultGateUntil = undefined;
        }
      }
    }
    return result;
  }

  @Get('fake')
  fake(@Session() session: SessionData) {
    if (!session.fakeUnlocked) {
      throw new UnauthorizedException('Kho mồi chưa được mở');
    }
    return { notes: this.recipeService.fakeNotes() };
  }
}
