'use client';
import { useState } from 'react';
import { authApi } from '@/features/auth/api/auth.api';
import { KeyStore } from '@/stores/key.store';

export function UnlockScreen() {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const unlock = KeyStore((s) => s.unlock);
    const lockReason = KeyStore((s) => s.lockReason);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault(); setError(''); setBusy(true);
        try {
            const bundle = await authApi.keys();
            const ok = await unlock(password, bundle);
            if (!ok) setError('Mật khẩu không đúng — không mở được kho.');
        } catch {
            setError('Không lấy được hồ sơ khóa. Thử đăng nhập lại.');
        } finally { setBusy(false); setPassword(''); }
    }

    return (
        <section className="mx-auto mt-10 max-w-sm rounded-2xl bg-white p-6 text-stone-800 shadow">
            <p className="text-xs uppercase tracking-widest text-amber-600">Kho đang bị khóa</p>
            <h1 className="text-2xl font-bold">Mở khóa kho</h1>
            {(lockReason === 'idle' || lockReason === 'server') && (
                <div className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-stone-600">
                    Kho đã <strong>tự khóa</strong> do không hoạt động.
                </div>
            )}
            {error && <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
            <form onSubmit={onSubmit} className="mt-4 space-y-3">
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoFocus
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 outline-none focus:border-amber-500" placeholder="Mật khẩu" />
                <button type="submit" disabled={busy} className="w-full rounded-lg bg-amber-600 py-2.5 font-medium text-white disabled:opacity-60">
                    {busy ? 'Đang tạo khóa...' : 'Mở khóa'}
                </button>
            </form>
        </section>
    );
}