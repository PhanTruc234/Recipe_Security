'use client';

import { use2faStatus, useDisable2fa, useEnable2fa, useSetup2fa } from '@/features/auth/hooks/use-2fa';
import { useState } from 'react';

export function TwoFactorSettings() {
    const [mode, setMode] = useState<'idle' | 'setup' | 'disable'>('idle');
    const [qr, setQr] = useState('');
    const [secret, setSecret] = useState('');
    const [code, setCode] = useState('');
    const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
    const [error, setError] = useState('');

    const { data: status } = use2faStatus();
    const setup = useSetup2fa();
    const enable = useEnable2fa();
    const disable = useDisable2fa();

    async function startSetup() {
        setError(''); setBackupCodes(null);
        const res = await setup.mutateAsync();
        if (!res.ok || !res.data) return setError('Không khởi tạo được 2FA.');
        setQr(res.data.qr); setSecret(res.data.secret); setMode('setup');
    }
    async function confirmEnable(e: React.FormEvent) {
        e.preventDefault(); setError('');
        const res = await enable.mutateAsync(code);
        if (!res.ok || !res.data) return setError('Mã không đúng. Kiểm tra lại app Authenticator.');
        setBackupCodes(res.data.backupCodes);
        setMode('idle'); setCode(''); setQr(''); setSecret('');
    }
    async function confirmDisable(e: React.FormEvent) {
        e.preventDefault(); setError('');
        const res = await disable.mutateAsync(code);
        if (!res.ok) return setError('Mã không đúng, không thể tắt 2FA.');
        setMode('idle'); setCode('');
    }

    if (status === undefined) return null;
    const enabled = status.enabled;
    const input = 'w-full rounded-lg border border-stone-300 px-3 py-2 outline-none focus:border-amber-500';

    return (
        <aside className="mt-6 rounded-xl bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-widest text-amber-600">Xác thực 2 lớp</p>
            <h2 className="text-lg font-semibold">Bảo mật tài khoản</h2>
            <p className="mt-1 text-sm">
                Trạng thái:{' '}
                <strong className={enabled ? 'text-green-600' : 'text-stone-400'}>{enabled ? 'Đang bật' : 'Đang tắt'}</strong>
            </p>

            {error && <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

            {backupCodes && (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <strong className="text-sm">Mã dự phòng (lưu ngay, chỉ hiện một lần):</strong>
                    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {backupCodes.map((c) => <code key={c} className="rounded bg-white px-2 py-1 text-center text-sm">{c}</code>)}
                    </div>
                </div>
            )}

            {mode === 'idle' && !enabled && (
                <button onClick={startSetup} disabled={setup.isPending}
                    className="mt-3 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
                    {setup.isPending ? 'Đang khởi tạo...' : 'Bật 2FA'}
                </button>
            )}
            {mode === 'idle' && enabled && (
                <button onClick={() => setMode('disable')} className="mt-3 rounded-lg border border-stone-300 px-4 py-2 text-sm">Tắt 2FA</button>
            )}

            {mode === 'setup' && (
                <div className="mt-3 space-y-2">
                    <p className="text-sm text-stone-600">1. Quét mã QR bằng Google Authenticator / Authy:</p>
                    {qr && <img src={qr} alt="Mã QR 2FA" className="h-40 w-40" />}
                    <p className="text-xs text-stone-500">Không quét được? Nhập tay khóa: <code className="rounded bg-stone-100 px-1">{secret}</code></p>
                    <form onSubmit={confirmEnable} className="space-y-2">
                        <label className="block text-sm">2. Nhập mã 6 số trên app
                            <input inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" required className={input} />
                        </label>
                        <div className="flex gap-2">
                            <button type="submit" disabled={enable.isPending} className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">Xác nhận bật</button>
                            <button type="button" onClick={() => { setMode('idle'); setError(''); }} className="rounded-lg border border-stone-300 px-4 py-2 text-sm">Hủy</button>
                        </div>
                    </form>
                </div>
            )}

            {mode === 'disable' && (
                <form onSubmit={confirmDisable} className="mt-3 space-y-2">
                    <label className="block text-sm">Nhập mã 2FA (hoặc mã dự phòng) để tắt
                        <input inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" required className={input} />
                    </label>
                    <div className="flex gap-2">
                        <button type="submit" disabled={disable.isPending} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">Xác nhận tắt</button>
                        <button type="button" onClick={() => { setMode('idle'); setError(''); }} className="rounded-lg border border-stone-300 px-4 py-2 text-sm">Hủy</button>
                    </div>
                </form>
            )}
        </aside>
    );
}