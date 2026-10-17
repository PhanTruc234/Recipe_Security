'use client';

import type { VaultItem } from '@/features/credential/decrypt';

function Row({ label, n, tone }: { label: string; n: number; tone?: 'bad' | 'warn' }) {
    const color = tone === 'bad' ? 'text-red-600' : tone === 'warn' ? 'text-amber-600' : 'text-stone-700';
    return (
        <div className="flex justify-between">
            <span className="text-stone-500">{label}</span>
            <strong className={color}>{n}</strong>
        </div>
    );
}

export function VaultHealth({ items, onScan, scanning, progress }: {
    items: VaultItem[]; onScan: () => void; scanning: boolean; progress: string;
}) {
    const breached = items.filter((i) => (i.breachCount ?? 0) > 0);
    const weak = items.filter((i) => i.strength.level === 'yeu');
    const reused = items.filter((i) => i.reused);
    const unchecked = items.filter((i) => i.breachCount === null);

    const penalty = (i: VaultItem) =>
        ((i.breachCount ?? 0) > 0 ? 1.0 : 0) + (i.strength.level === 'yeu' ? 0.5 : 0) + (i.reused ? 0.3 : 0);
    const total = items.reduce((s, i) => s + Math.min(penalty(i), 1), 0);
    const score = items.length === 0 ? 100 : Math.round(100 - (total / items.length) * 100);
    const scoreColor = score >= 80 ? 'text-green-600' : score >= 50 ? 'text-amber-600' : 'text-red-600';

    return (
        <aside className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-widest text-amber-600">Sức khỏe kho</p>
            <div className={`my-2 text-4xl font-bold ${scoreColor}`}>
                {score}<span className="text-base text-stone-400">/100</span>
            </div>
            <div className="space-y-1 text-sm">
                <Row label="Đã bị lộ" n={breached.length} tone={breached.length ? 'bad' : undefined} />
                <Row label="Mật khẩu yếu" n={weak.length} tone={weak.length ? 'warn' : undefined} />
                <Row label="Dùng lại" n={reused.length} tone={reused.length ? 'warn' : undefined} />
                <Row label="Chưa kiểm tra" n={unchecked.length} />
            </div>
            <button onClick={onScan} disabled={scanning || items.length === 0}
                className="mt-3 w-full rounded-lg bg-amber-600 py-2 text-sm font-medium text-white disabled:opacity-60">
                {scanning ? 'Đang quét...' : 'Quét rò rỉ toàn kho'}
            </button>
            {progress && <p className="mt-1 text-xs text-stone-500">{progress}</p>}
            <p className="mt-3 text-xs text-stone-400">
                Quét dùng <strong>k-anonymity</strong>: chỉ 5 ký tự đầu SHA-1 gửi đi, mật khẩu không rời máy.
            </p>
        </aside>
    );
}