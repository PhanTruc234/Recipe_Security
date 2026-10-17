import { assessStrength, StrengthResult } from '@/libs/crypto/passwordGen';
import { decryptCredential, type CredentialData } from '@/libs/crypto/vault';
import type { EncryptedCredential } from '@/types';

export interface VaultItem extends CredentialData {
    id: string;
    updatedAt: string;
    reused: boolean;
    strength: StrengthResult;
}

async function fingerprint(password: string): Promise<string> {
    const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
    return Array.from(new Uint8Array(d).slice(0, 8)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function decryptRows(key: Uint8Array, rows: EncryptedCredential[]): Promise<VaultItem[]> {
    const decrypted: { id: string; updatedAt: string; data: CredentialData }[] = [];
    for (const row of rows) {
        try {
            const data = await decryptCredential(key, { ciphertext: row.ciphertext, iv: row.iv });
            decrypted.push({ id: row.id, updatedAt: row.updatedAt, data });
        } catch {
            // mục hỏng -> bỏ qua, không sập cả kho
        }
    }

    const prints = await Promise.all(decrypted.map((d) => fingerprint(d.data.password)));
    const seen = new Map<string, number>();
    prints.forEach((p) => seen.set(p, (seen.get(p) ?? 0) + 1));

    return decrypted.map((d, i) => ({
        ...d.data,
        id: d.id,
        updatedAt: d.updatedAt,
        reused: (seen.get(prints[i]) ?? 0) > 1,
        strength: assessStrength(d.data.password),
    }));
}