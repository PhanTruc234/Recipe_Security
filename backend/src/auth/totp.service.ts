import { Injectable } from '@nestjs/common';
import { generateSecret, generateURI, verify } from 'otplib';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcryptjs';

const ISSUER = 'Recipe Security';

@Injectable()
export class TotpService {
  generateSecret(): string {
    return generateSecret();
  }

  keyuri(email: string, secret: string): string {
    return generateURI({ issuer: ISSUER, label: email, secret });
  }
  // Trả về time-step của mã nếu hợp lệ VÀ mới hơn afterTimeStep, ngược lại null
  async verifyStep(
    token: string,
    secret: string,
    afterTimeStep?: number | null,
  ): Promise<number | null> {
    try {
      const res = await verify({
        secret,
        token: String(token),
        epochTolerance: 30,
        afterTimeStep: afterTimeStep ?? undefined,
      });
      return res.valid && 'timeStep' in res ? res.timeStep : null;
    } catch {
      return null;
    }
  }

  generateBackupCodes(n = 8): string[] {
    return Array.from({ length: n }, () => randomBytes(4).toString('hex'));
  }

  hashCodes(codes: string[]): string[] {
    return codes.map((c) => bcrypt.hashSync(c, 10));
  }

  matchAndConsume(input: string, hashedList: string[]): string[] | null {
    for (let i = 0; i < hashedList.length; i++) {
      if (bcrypt.compareSync(String(input), hashedList[i])) {
        const rest = hashedList.slice();
        rest.splice(i, 1);
        return rest;
      }
    }
    return null;
  }
}
