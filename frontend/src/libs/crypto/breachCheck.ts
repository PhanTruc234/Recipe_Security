const API = 'https://api.pwnedpasswords.com/range/';

async function sha1Hex(text: string): Promise<string> {
    const digest = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase();
}

export interface BreachResult {
    count: number;
    checkedAt: string;
    candidates: number;
}

const prefixCache = new Map<string, string>();

export async function checkPassword(password: string): Promise<BreachResult> {
    const hash = await sha1Hex(password);
    const prefix = hash.slice(0, 5);
    const suffix = hash.slice(5);

    let body = prefixCache.get(prefix);
    if (body === undefined) {
        const res = await fetch(API + prefix, {
            headers: { 'Add-Padding': 'true' },
        });
        if (!res.ok) throw new Error('Không gọi được dịch vụ kiểm tra rò rỉ');
        body = await res.text();
        prefixCache.set(prefix, body);
    }

    const lines = body.split('\n');
    let count = 0;
    for (const line of lines) {
        const [sfx, times] = line.trim().split(':');
        if (sfx === suffix) {
            count = Number(times) || 0;
            break;
        }
    }

    return { count, checkedAt: new Date().toISOString(), candidates: lines.length };
}
export function breachLabel(count: number): string {
    if (count === 0) return 'Chưa thấy trong vụ rò rỉ nào';
    if (count === 1) return 'Đã xuất hiện trong 1 vụ rò rỉ';
    return `Đã bị lộ ${count.toLocaleString('vi-VN')} lần`;
}
