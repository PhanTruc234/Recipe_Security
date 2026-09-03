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
    async verify(token: string, secret: string): Promise<boolean> {
        try {
            const res = await verify({ secret, token: String(token), epochTolerance: 30 });
            return res.valid;
        } catch {
            return false;
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