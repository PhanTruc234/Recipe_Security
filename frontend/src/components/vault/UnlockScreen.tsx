'use client';
import { useState, useEffect } from 'react';
import { authApi } from '@/features/auth/api/auth.api';
import { KeyStore } from '@/stores/key.store';
import {
    hasPinConfigured,
    hasBiometricsConfigured,
    unlockWithPin,
    unlockWithBiometrics,
} from '@/libs/crypto/quick-unlock';

export function UnlockScreen() {
    const [mode, setMode] = useState<'password' | 'pin'>('password');
    const [password, setPassword] = useState('');
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [bioAvailable, setBioAvailable] = useState(false);
    const [pinAvailable, setPinAvailable] = useState(false);

    const unlock = KeyStore((s) => s.unlock);
    const lockReason = KeyStore((s) => s.lockReason);

    useEffect(() => {
        const pinSet = hasPinConfigured();
        const bioSet = hasBiometricsConfigured();
        setPinAvailable(pinSet);
        setBioAvailable(bioSet);

        // Ưu tiên: nếu có PIN thì chuyển sang tab PIN cho tiện, hoặc giữ password
        if (pinSet) {
            setMode('pin');
        }
    }, []);

    async function onPasswordSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setBusy(true);
        try {
            const bundle = await authApi.keys();
            const ok = await unlock(password, bundle);
            if (!ok) setError('Mật khẩu không đúng — không mở được kho.');
        } catch {
            setError('Không lấy được hồ sơ khóa. Thử đăng nhập lại.');
        } finally {
            setBusy(false);
            setPassword('');
        }
    }

    async function onPinSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setBusy(true);
        const res = await unlockWithPin(pin);
        setBusy(false);
        setPin('');

        if (!res.ok) {
            setError(res.error ?? 'Mã PIN không đúng.');
            if (res.remainingFails === 0) {
                setPinAvailable(false);
                setMode('password');
            }
        }
    }

    async function onBiometricClick() {
        setError('');
        setBusy(true);
        const res = await unlockWithBiometrics();
        setBusy(false);

        if (!res.ok) {
            setError(res.error ?? 'Xác thực sinh trắc học thất bại.');
        }
    }

    return (
        <section className="mx-auto mt-10 max-w-sm rounded-2xl bg-white p-6 text-stone-800 shadow">
            <p className="text-xs uppercase tracking-widest text-amber-600">Bảo mật</p>
            <h1 className="text-2xl font-bold">Mở khóa</h1>
            {(lockReason === 'idle' || lockReason === 'server') && (
                <div className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-stone-600">
                    Tự động khóa do không hoạt động.
                </div>
            )}

            {error && (
                <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                </div>
            )}

            {/* Nút mở khóa nhanh bằng Vân tay / Face ID nếu có */}
            {bioAvailable && (
                <div className="mt-4">
                    <button
                        type="button"
                        onClick={onBiometricClick}
                        disabled={busy}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-amber-500 bg-amber-50/50 py-3 font-semibold text-amber-800 transition hover:bg-amber-100 disabled:opacity-60"
                    >
                        <svg className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 004.07 9.29m4.878 12.155A20.06 20.06 0 014 11" />
                        </svg>
                        <span>Quét Vân tay / Face ID</span>
                    </button>
                    <div className="my-3 flex items-center gap-2 text-xs text-stone-400">
                        <div className="h-px flex-1 bg-stone-200" />
                        <span>hoặc</span>
                        <div className="h-px flex-1 bg-stone-200" />
                    </div>
                </div>
            )}

            {/* Tab chuyển đổi giữa Mã PIN và Mật khẩu chủ */}
            {pinAvailable && (
                <div className="mt-2 flex rounded-lg bg-stone-100 p-1 text-xs font-medium text-stone-600">
                    <button
                        type="button"
                        onClick={() => { setMode('pin'); setError(''); }}
                        className={`flex-1 rounded-md py-1.5 transition ${mode === 'pin' ? 'bg-white text-stone-900 shadow-xs' : 'hover:text-stone-900'}`}
                    >
                        Mã PIN
                    </button>
                    <button
                        type="button"
                        onClick={() => { setMode('password'); setError(''); }}
                        className={`flex-1 rounded-md py-1.5 transition ${mode === 'password' ? 'bg-white text-stone-900 shadow-xs' : 'hover:text-stone-900'}`}
                    >
                        Mật khẩu chủ
                    </button>
                </div>
            )}

            {/* Form mở bằng PIN */}
            {mode === 'pin' && pinAvailable ? (
                <form onSubmit={onPinSubmit} className="mt-4 space-y-3">
                    <div>
                        <input
                            type="password"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={8}
                            value={pin}
                            onChange={(e) => setPin(e.target.value)}
                            required
                            autoFocus
                            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-center text-xl tracking-widest outline-none focus:border-amber-500"
                            placeholder="Nhập mã PIN"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={busy || pin.length < 4}
                        className="w-full rounded-lg bg-amber-600 py-2.5 font-medium text-white transition hover:bg-amber-700 disabled:opacity-60"
                    >
                        {busy ? 'Đang mở khóa...' : 'Mở bằng mã PIN'}
                    </button>
                </form>
            ) : (
                /* Form mở bằng Mật khẩu chủ */
                <form onSubmit={onPasswordSubmit} className="mt-4 space-y-3">
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoFocus
                        className="w-full rounded-lg border border-stone-300 px-3 py-2 outline-none focus:border-amber-500"
                        placeholder="Mật khẩu chủ"
                    />
                    <button
                        type="submit"
                        disabled={busy}
                        className="w-full rounded-lg bg-amber-600 py-2.5 font-medium text-white transition hover:bg-amber-700 disabled:opacity-60"
                    >
                        {busy ? 'Đang tạo khóa...' : 'Mở bằng Mật khẩu chủ'}
                    </button>
                </form>
            )}
        </section>
    );
}