import { Injectable } from '@nestjs/common';
import { timingSafeEqual } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { SecurityLogService } from '../security-log/security-log.service';
import { generateRecipe, looksLikeDish, fakeVaultNotes } from './fake-recipe';

@Injectable()
export class RecipeService {
  constructor(private readonly securityLog: SecurityLogService) { }
  private timingSafeEqualStr(a: string, b: string): boolean {
    const ba = Buffer.from(a);
    const bb = Buffer.from(b);
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  }

  async search(query: string, meta: { ip?: string; userAgent?: string }) {
    const realHash = process.env.VAULT_REAL_CODE_HASH;
    if (realHash && (await bcrypt.compare(query, realHash))) {
      await this.securityLog.record({ event: 'real_gate_unlocked', ip: meta.ip, userAgent: meta.userAgent, context: { channel: 'recipe_search' } });
      return { unlocked: 'real' as const };
    }
    const fakeCode = process.env.FAKE_CODE ?? '';
    if (fakeCode && this.timingSafeEqualStr(query, fakeCode)) {
      await this.securityLog.record({ event: 'fake_gate_unlocked', ip: meta.ip, userAgent: meta.userAgent, context: { channel: 'recipe_search' } });
      return { unlocked: 'fake' as const };
    }

    if (!looksLikeDish(query)) return { notFound: true as const };
    return { recipe: generateRecipe(query) };
  }

  fakeNotes() {
    return fakeVaultNotes();
  }
}