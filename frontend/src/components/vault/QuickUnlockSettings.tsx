'use client';

import { useState, useEffect } from 'react';
import {
    hasPinConfigured,
    clearPinConfig,
    setupPinUnlock,
    isBiometricsAvailable,
    hasBiometricsConfigured,
    clearBiometricsConfig,
    setupBiometricsUnlock,
} from '@/libs/crypto/quick-unlock';

export function QuickUnlockSettings() {
    const [pinEnabled, setPinEnabled] = useState(false);
    const [bioEnabled, setBioEnabled] = useState(false);
    const [bioSupported, setBioSupported] = useState(false);

    const [showPinModal, setShowPinModal] = useState(false);
    const [pin, setPin] = useState('');
    const [pinConfirm, setPinConfirm] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        setPinEnabled(hasPinConfigured());
        setBioEnabled(hasBiometricsConfigured());
        isBiometricsAvailable().then(setBioSupported);
    }, []);

    async function handleSavePin(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        if (pin.length < 4 || pin.length > 8 || !/^\d+$/.test(pin)) {
            setError('Mã PIN gồm 4 đến 8 chữ số.');
            return;
        }
        if (pin !== pinConfirm) {
            setError('Mã xác nhận không khớp.');
            return;
        }

        setBusy(true);
        const res = await setupPinUnlock(pin);
        setBusy(false);

        if (!res.ok) {
            setError(res.error ?? 'Không thể lưu mã PIN.');
            return;
        }

        setPinEnabled(true);
        setShowPinModal(false);
        setPin('');
        setPinConfirm('');
        setSuccess('Đã kích hoạt mã PIN.');
        setTimeout(() => setSuccess(''), 3000);
    }

    function handleRemovePin() {
        if (!confirm('Tắt mở khóa bằng mã PIN trên thiết bị này?')) return;
        clearPinConfig();
        setPinEnabled(false);
        setSuccess('Đã tắt mã PIN.');
        setTimeout(() => setSuccess(''), 3000);
    }

    async function handleToggleBio() {
        setError('');
        if (bioEnabled) {
            if (!confirm('Tắt mở khóa sinh trắc học trên thiết bị này?')) return;
            clearBiometricsConfig();
            setBioEnabled(false);
            setSuccess('Đã tắt sinh trắc học.');
            setTimeout(() => setSuccess(''), 3000);
            return;
        }

        const res = await setupBiometricsUnlock();
        setBusy(false);

        if (!res.ok) {
            setError(res.error ?? 'Không thể kích hoạt sinh trắc học.');
            return;
        }

        setBioEnabled(true);
        setSuccess('Đã kích hoạt sinh trắc học.');
        setTimeout(() => setSuccess(''), 3000);
    }

    return (
        <aside className="mt-6 rounded-xl bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-widest text-amber-600">Tiện ích</p>
            <h2 className="text-lg font-semibold">Mở khóa nhanh</h2>

            {error && <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
            {success && <div className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{success}</div>}

            <div className="mt-4 space-y-3">
                {/* 1. Mã PIN */}
                <div className="flex items-center justify-between rounded-lg border border-stone-200 p-3.5">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-medium text-stone-800">Mã PIN</span>
                            <span className={`rounded px-1.5 py-0.5 text-xs ${pinEnabled ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-500'}`}>
                                {pinEnabled ? 'Bật' : 'Tắt'}
                            </span>
                        </div>
                        <p className="mt-0.5 text-xs text-stone-400">Tự khóa sau 3 lần sai.</p>
                    </div>

                    <div>
                        {pinEnabled ? (
                            <button
                                type="button"
                                onClick={handleRemovePin}
                                className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                            >
                                Tắt
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => { setShowPinModal(true); setError(''); }}
                                className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700"
                            >
                                Cài đặt
                            </button>
                        )}
                    </div>
                </div>

                {/* 2. Sinh trắc học */}
                <div className="flex items-center justify-between rounded-lg border border-stone-200 p-3.5">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-medium text-stone-800">Vân tay / Face ID</span>
                            <span className={`rounded px-1.5 py-0.5 text-xs ${bioEnabled ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-500'}`}>
                                {bioEnabled ? 'Bật' : 'Tắt'}
                            </span>
                        </div>
                        <p className="mt-0.5 text-xs text-stone-400">
                            {bioSupported ? 'Touch ID, Face ID, Windows Hello.' : 'Thiết bị không hỗ trợ.'}
                        </p>
                    </div>

                    <div>
                        <button
                            type="button"
                            disabled={!bioSupported || busy}
                            onClick={handleToggleBio}
                            className={`rounded-lg px-3 py-1.5 text-xs transition ${
                                !bioSupported
                                    ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
                                    : bioEnabled
                                      ? 'border border-stone-200 text-red-600 hover:bg-red-50'
                                      : 'bg-amber-600 font-medium text-white hover:bg-amber-700'
                            }`}
                        >
                            {busy ? 'Đang xử lý...' : bioEnabled ? 'Tắt' : 'Kích hoạt'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Modal cài đặt mã PIN */}
            {showPinModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
                    <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
                        <h3 className="text-base font-semibold text-stone-800">Cài đặt mã PIN</h3>
                        <p className="mt-1 text-xs text-stone-400">Từ 4 đến 8 chữ số.</p>

                        <form onSubmit={handleSavePin} className="mt-4 space-y-3">
                            <div>
                                <input
                                    type="password"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    maxLength={8}
                                    value={pin}
                                    onChange={(e) => setPin(e.target.value)}
                                    placeholder="Nhập mã PIN"
                                    required
                                    autoFocus
                                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-center text-lg tracking-widest outline-none focus:border-amber-500"
                                />
                            </div>

                            <div>
                                <input
                                    type="password"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    maxLength={8}
                                    value={pinConfirm}
                                    onChange={(e) => setPinConfirm(e.target.value)}
                                    placeholder="Xác nhận mã PIN"
                                    required
                                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-center text-lg tracking-widest outline-none focus:border-amber-500"
                                />
                            </div>

                            <div className="mt-4 flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => { setShowPinModal(false); setPin(''); setPinConfirm(''); }}
                                    className="flex-1 rounded-lg border border-stone-200 py-2 text-sm text-stone-600 hover:bg-stone-50"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={busy}
                                    className="flex-1 rounded-lg bg-amber-600 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-60"
                                >
                                    {busy ? 'Đang lưu...' : 'Lưu'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </aside>
    );
}
