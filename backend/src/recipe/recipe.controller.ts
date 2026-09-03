import {
  Body, Controller, Get, Headers, Ip, Post, Session, UnauthorizedException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { SessionData } from 'express-session';
import { RecipeService } from './recipe.service';
import { SearchDto } from './dto/search.dto';

@Controller('recipe')
export class RecipeController {
  constructor(private readonly recipeService: RecipeService) { }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('search')
  async search(
    @Body() dto: SearchDto,
    @Session() session: SessionData,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const result = await this.recipeService.search(dto.query, { ip, userAgent });
    if ('unlocked' in result) {
      if (result.unlocked === 'real') {
        session.vaultGate = 'real';
        session.vaultLastActivity = Math.floor(Date.now() / 1000);
      } else {
        session.fakeUnlocked = true;
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