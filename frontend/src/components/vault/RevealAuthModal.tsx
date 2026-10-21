'use client';

import { useState, useEffect } from 'react';
import type { VaultItem } from '@/features/credential/decrypt';
import {
    hasPinConfigured,
    hasBiometricsConfigured,
    unlockWithPin,
    unlockWithBiometrics,
} from '@/libs/crypto/quick-unlock';
import { authApi } from '@/features/auth/api/auth.api';
import { KeyStore } from '@/stores/key.store';

interface Props {
    item: VaultItem;
    onSuccess: () => void;
    onCancel: () => void;
}

export function RevealAuthModal({ item, onSuccess, onCancel }: Props) {
    const mode = item.requireRevealAuth ?? 'none';
    const [pin, setPin] = useState('');
    const [password, setPassword] = useState('');
    const [showPasswordFallback, setShowPasswordFallback] = useState(false);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    const [hasBio, setHasBio] = useState(false);
    const [hasPin, setHasPin] = useState(false);
    const unlock = KeyStore((s) => s.unlock);

    useEffect(() => {
        setHasBio(hasBiometricsConfigured());
        setHasPin(hasPinConfigured());
    }, []);

    // Tự động kích hoạt vân tay nếu mục yêu cầu bio hoặc quick và đã cài đặt
    useEffect(() => {
        if ((mode === 'bio' || mode === 'quick') && hasBiometricsConfigured()) {
            triggerBiometrics();
        }
    }, [mode, hasBio]);

    async function triggerBiometrics() {
        setError('');
        setBusy(true);
        const res = await unlockWithBiometrics();
        setBusy(false);

        if (res.ok) {
            onSuccess();
        } else {
            setError(res.error ?? 'Xác thực vân tay thất bại.');
        }
    }

    async function handlePinSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setBusy(true);
        const res = await unlockWithPin(pin);
        setBusy(false);
        setPin('');

        if (res.ok) {
            onSuccess();
        } else {
            setError(res.error ?? 'Mã PIN không đúng.');
        }
    }

    async function handlePasswordSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setBusy(true);
        try {
            const bundle = await authApi.keys();
            const ok = await unlock(password, bundle);
            if (ok) {
                onSuccess();
            } else {
                setError('Mật khẩu chủ không đúng.');
            }
        } catch {
            setError('Lỗi kết nối. Thử lại.');
        } finally {
            setBusy(false);
            setPassword('');
        }
    }

    const titleText =
        mode === 'bio'
            ? 'Vân tay / Face ID'
            : mode === 'pin'
              ? 'Mã PIN'
              : 'Xác minh';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
            <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
                <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold text-stone-800">{titleText}</h3>
                    <button
                        type="button"
                        onClick={onCancel}
                        className="rounded-md p-1 text-stone-400 hover:text-stone-600"
                    >
                        ✕
                    </button>
                </div>
                <p className="mt-1 text-xs text-stone-500">
                    Mục <strong className="text-stone-700">{item.service}</strong>
                </p>

                {error && <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}

                <div className="mt-4 space-y-3">
                    {/* 1. Nút Vân tay / Face ID */}
                    {/* Chỉ dùng sinh trắc học ĐÃ cài (cài mới phải qua Cài đặt + mật khẩu chủ):
                        nếu cho "cài rồi coi là đạt" thì người cầm máy chỉ cần đăng ký vân tay của họ */}
                    {(mode === 'bio' || mode === 'quick') && !showPasswordFallback && (
                        hasBio ? (
                            <button
                                type="button"
                                onClick={triggerBiometrics}
                                disabled={busy}
                                className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-500 bg-amber-500 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-amber-600 disabled:opacity-60"
                            >
                                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 004.07 9.29m4.878 12.155A20.06 20.06 0 014 11" />
                                </svg>
                                <span>{busy ? 'Đang xử lý...' : 'Quét Vân tay / Face ID'}</span>
                            </button>
                        ) : null
                    )}

                    {/* 2. Nhập PIN */}
                    {(mode === 'pin' || (mode === 'quick' && hasPin && !hasBio)) && !showPasswordFallback && (
                        hasPin ? (
                            <form onSubmit={handlePinSubmit} className="space-y-2">
                                <input
                                    type="password"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    maxLength={8}
                                    value={pin}
                                    onChange={(e) => setPin(e.target.value)}
                                    placeholder="Nhập mã PIN"
                                    autoFocus
                                    required
                                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-center text-lg tracking-widest outline-none focus:border-amber-500"
                                />
                                <button
                                    type="submit"
                                    disabled={busy || pin.length < 4}
                                    className="w-full rounded-lg bg-amber-600 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-60"
                                >
                                    {busy ? 'Đang kiểm tra...' : 'Xác nhận'}
                                </button>
                            </form>
                        ) : null
                    )}

                    {/* 3. Mật khẩu chủ */}
                    {(showPasswordFallback ||
                      (mode === 'bio' && !hasBio) ||
                      (mode === 'pin' && !hasPin) ||
                      (mode === 'quick' && !hasBio && !hasPin)) ? (
                        <form onSubmit={handlePasswordSubmit} className="space-y-2">
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Nhập Mật khẩu chủ"
                                autoFocus
                                required
                                className="w-full rounded-lg border border-stone-300 px-3 py-2 outline-none focus:border-amber-500"
                            />
                            <button
                                type="submit"
                                disabled={busy || !password}
                                className="w-full rounded-lg bg-amber-600 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-60"
                            >
                                {busy ? 'Đang kiểm tra...' : 'Xác nhận'}
                            </button>
                        </form>
                    ) : (
                        <div className="pt-1 text-center">
                            <button
                                type="button"
                                onClick={() => { setShowPasswordFallback(true); setError(''); }}
                                className="text-xs text-stone-500 hover:text-amber-800 hover:underline"
                            >
                                Dùng Mật khẩu chủ
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
