import { assessStrength, StrengthResult } from '@/libs/crypto/passwordGen';
import { decryptCredential, encryptCredential, type CredentialData } from '@/libs/crypto/vault';
import { KeyStore } from '@/stores/key.store';
import type { EncryptedCredential } from '@/types';
import { credentialApi } from './credential.api';

export interface VaultItem extends CredentialData {
    id: string;
    updatedAt: string;
    reused: boolean;
    strength: StrengthResult;
    legacy: boolean;
}

export interface DecryptResult {
    items: VaultItem[];
    failed: number;
}

async function fingerprint(password: string): Promise<string> {
    const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
    return Array.from(new Uint8Array(d).slice(0, 8)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function decryptRows(key: Uint8Array, rows: EncryptedCredential[]): Promise<DecryptResult> {
    const decrypted: { id: string; updatedAt: string; data: CredentialData; legacy: boolean }[] = [];
    let failed = 0;
    for (const row of rows) {
        try {
            const { data, legacy } = await decryptCredential(key, row.id, { ciphertext: row.ciphertext, iv: row.iv });
            decrypted.push({ id: row.id, updatedAt: row.updatedAt, data, legacy });
        } catch {
            // sai khóa / bị sửa / bị tráo sang id khác -> không hiển thị, nhưng đếm để cảnh báo
            failed += 1;
        }
    }

    const prints = await Promise.all(decrypted.map((d) => fingerprint(d.data.password)));
    const seen = new Map<string, number>();
    prints.forEach((p) => seen.set(p, (seen.get(p) ?? 0) + 1));

    const items = decrypted.map((d, i) => ({
        ...d.data,
        id: d.id,
        updatedAt: d.updatedAt,
        legacy: d.legacy,
        reused: (seen.get(prints[i]) ?? 0) > 1,
        strength: assessStrength(d.data.password),
    }));
    return { items, failed };
}

const toData = (i: VaultItem): CredentialData => ({
    service: i.service,
    url: i.url,
    username: i.username,
    password: i.password,
    note: i.note,
    breachCount: i.breachCount,
    checkedAt: i.checkedAt,
    requireRevealAuth: i.requireRevealAuth,
});

// Mã hóa lại các mục định dạng cũ sang v2 (có AAD). Dừng ngay nếu kho vừa bị khóa:
// lock() ghi đè khóa bằng 0, mã hóa tiếp sẽ ra dữ liệu ai cũng giải được.
export async function upgradeLegacyItems(key: Uint8Array, items: VaultItem[]): Promise<number> {
    let upgraded = 0;
    for (const item of items) {
        if (!item.legacy) continue;
        if (KeyStore.getState().encryptionKey !== key) break;
        const blob = await encryptCredential(key, item.id, toData(item));
        const res = await credentialApi.update(item.id, blob);
        if (res.ok) upgraded += 1;
    }
    return upgraded;
}
