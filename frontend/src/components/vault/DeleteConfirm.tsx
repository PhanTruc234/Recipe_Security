'use client';
import { useState } from 'react';

export function DeleteConfirm({ service, busy, error, onConfirm, onCancel }: {
    service: string; busy: boolean; error?: string | null;
    onConfirm: (code?: string) => void; onCancel: () => void;
}) {
    const [code, setCode] = useState('');
    return (
        <div className="rounded-xl border border-red-200 bg-red-50/50 p-4">
            <h3 className="font-semibold">Xóa mục &quot;{service}&quot;?</h3>
            <p className="mt-1 text-sm text-stone-600">Server chỉ giữ bản mã hóa — xóa xong <strong>không ai khôi phục được</strong>.</p>
            {error && <div className="mt-2 rounded-lg bg-red-100 px-3 py-2 text-sm text-red-700">{error}</div>}
            <form onSubmit={(e) => { e.preventDefault(); onConfirm(code.trim() || undefined); }} className="mt-3 space-y-2">
                <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code"
                    placeholder="Mã 2FA nếu đã bật (6 số / mã dự phòng)"
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-amber-500" />
                <div className="flex gap-2">
                    <button type="submit" disabled={busy} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
                        {busy ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
                    </button>
                    <button type="button" onClick={onCancel} disabled={busy} className="rounded-lg border border-stone-300 px-4 py-2 text-sm">Hủy</button>
                </div>
            </form>
        </div>
    );
}