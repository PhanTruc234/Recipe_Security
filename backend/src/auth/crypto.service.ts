import { Injectable } from '@nestjs/common';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

const CIPHER = 'aes-256-gcm';

@Injectable()
export class CryptoService {
    private serverKey() {
        return createHash('sha256').update(process.env.TOTP_ENC_KEY ?? '').digest();
    }

    encryptServer(plain: string): string {
        const iv = randomBytes(12);
        const cipher = createCipheriv(CIPHER, this.serverKey(), iv);
        const enc = Buffer.concat([cipher.update(Buffer.from(plain, 'utf8')), cipher.final()]);
        const container = {
            v: 1,
            iv: iv.toString('base64'),
            tag: cipher.getAuthTag().toString('base64'),
            value: enc.toString('base64'),
        };
        return Buffer.from(JSON.stringify(container), 'utf8').toString('base64');
    }

    decryptServer(payload: string): string {
        const j = JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
        const d = createDecipheriv(CIPHER, this.serverKey(), Buffer.from(j.iv, 'base64'));
        d.setAuthTag(Buffer.from(j.tag, 'base64'));
        return Buffer.concat([d.update(Buffer.from(j.value, 'base64')), d.final()]).toString('utf8');
    }
}