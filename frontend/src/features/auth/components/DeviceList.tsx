'use client';
import { useState } from 'react';
import {
    useDevices,
    useRevokeDevice,
    useRenameDevice,
} from '@/features/auth/hooks/use-devices';
import { useStepUp } from '@/features/auth/hooks/use-step-up';
import type { DeviceSession } from '@/types';

function describeUA(ua: string | null): string {
    if (!ua) return 'Thiết bị không rõ';
    const browser = /Edg/.test(ua)
        ? 'Edge'
        : /Chrome/.test(ua)
          ? 'Chrome'
          : /Firefox/.test(ua)
            ? 'Firefox'
            : /Safari/.test(ua)
              ? 'Safari'
              : 'Trình duyệt khác';
    const os = /Windows/.test(ua)
        ? 'Windows'
        : /Android/.test(ua)
          ? 'Android'
          : /iPhone|iPad|iOS/.test(ua)
            ? 'iOS'
            : /Mac OS X|Macintosh/.test(ua)
              ? 'macOS'
              : /Linux/.test(ua)
                ? 'Linux'
                : 'HĐH khác';
    const kind = /iPad|Tablet/.test(ua)
        ? 'Máy tính bảng'
        : /Mobile|Android|iPhone/.test(ua)
          ? 'Điện thoại'
          : 'Máy tính';
    return `${browser} · ${os} · ${kind}`;
}

function fmt(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('vi-VN');
}

export function DeviceList() {
    const { data, isLoading, isError } = useDevices();
    const revoke = useRevokeDevice();
    const rename = useRenameDevice();
    const step = useStepUp();
    const [verifying, setVerifying] = useState(false);
    const [confirmId, setConfirmId] = useState<string | null>(null);
    const [renameId, setRenameId] = useState<string | null>(null);
    const [code, setCode] = useState('');
    const [name, setName] = useState('');
    const [err, setErr] = useState<string | null>(null);

    if (isLoading) {
        return <p className="text-sm text-stone-500">Đang tải thiết bị...</p>;
    }
    if (isError || !data) {
        return (
            <p className="text-sm text-red-600">
                Không tải được danh sách thiết bị.
            </p>
        );
    }

    async function onRevoke(deviceId: string) {
        setErr(null);
        setVerifying(true);
        try {
            const stepUp = await step.build(code);
            const res = await revoke.mutateAsync({ deviceId, stepUp });
            if (!res.ok) {
                setErr(res.error ?? 'Không thu hồi được.');
                return;
            }
            setConfirmId(null);
        } catch {
            setErr('Lỗi mạng — thử lại.');
        } finally {
            setVerifying(false);
            setCode('');
        }
    }

    async function onRename(deviceId: string) {
        const label = name.trim();
        if (!label) return;
        setErr(null);
        try {
            const res = await rename.mutateAsync({ deviceId, label });
            if (!res.ok) {
                setErr(res.error ?? 'Không đổi tên được.');
                return;
            }
            setRenameId(null);
            setName('');
        } catch {
            setErr('Lỗi mạng — thử lại.');
        }
    }

    return (
        <div className="space-y-3">
            {data.length === 0 && (
                <p className="text-sm text-stone-500">Không có phiên nào.</p>
            )}
            {data.map((d: DeviceSession) => {
                const uaText = describeUA(d.userAgent);
                const title = d.label ?? uaText;
                return (
                    <div
                        key={d.deviceId}
                        className={`rounded-xl border p-4 ${d.current ? 'border-amber-300 bg-amber-50/50' : 'border-stone-200 bg-white'}`}
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="font-medium text-stone-800">
                                        {title}
                                    </h3>
                                    {d.current && (
                                        <span className="rounded-full bg-amber-600 px-2 py-0.5 text-xs text-white">
                                            Thiết bị này
                                        </span>
                                    )}
                                </div>
                                {d.label && (
                                    <p className="text-xs text-stone-400">{uaText}</p>
                                )}
                                <p className="mt-1 text-sm text-stone-500">
                                    IP: {d.ip ?? '—'} · Đăng nhập: {fmt(d.createdAt)}
                                </p>
                                {!d.current && (
                                    <p className="mt-0.5 text-xs text-stone-400">
                                        Không phải bạn? Hãy thu hồi.
                                    </p>
                                )}
                            </div>
                            <div className="flex shrink-0 flex-col items-end gap-1">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setRenameId(d.deviceId);
                                        setConfirmId(null);
                                        setName(d.label ?? '');
                                        setErr(null);
                                    }}
                                    className="rounded-lg px-2 py-1 text-sm text-stone-500 hover:bg-stone-100"
                                >
                                    Đổi tên
                                </button>
                                {!d.current && confirmId !== d.deviceId && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setConfirmId(d.deviceId);
                                            setRenameId(null);
                                            setErr(null);
                                            setCode('');
                                        }}
                                        className="rounded-lg border border-red-300 px-3 py-1 text-sm text-red-600 hover:bg-red-50"
                                    >
                                        Thu hồi
                                    </button>
                                )}
                            </div>
                        </div>

                        {renameId === d.deviceId && (
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    void onRename(d.deviceId);
                                }}
                                className="mt-3 space-y-2 border-t border-stone-200 pt-3"
                            >
                                {err && (
                                    <div className="rounded-lg bg-red-100 px-3 py-2 text-sm text-red-700">
                                        {err}
                                    </div>
                                )}
                                <input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    maxLength={40}
                                    autoFocus
                                    placeholder='Tên thiết bị (vd: "Laptop Dell")'
                                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-amber-500"
                                />
                                <div className="flex gap-2">
                                    <button
                                        type="submit"
                                        disabled={rename.isPending}
                                        className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                                    >
                                        {rename.isPending ? 'Đang lưu...' : 'Lưu tên'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setRenameId(null);
                                            setErr(null);
                                        }}
                                        disabled={rename.isPending}
                                        className="rounded-lg border border-stone-300 px-4 py-2 text-sm"
                                    >
                                        Hủy
                                    </button>
                                </div>
                            </form>
                        )}

                        {confirmId === d.deviceId && (
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    void onRevoke(d.deviceId);
                                }}
                                className="mt-3 space-y-2 border-t border-stone-200 pt-3"
                            >
                                {err && (
                                    <div className="rounded-lg bg-red-100 px-3 py-2 text-sm text-red-700">
                                        {err}
                                    </div>
                                )}
                                <input
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    type={step.uses2fa ? 'text' : 'password'}
                                    inputMode={step.uses2fa ? 'numeric' : undefined}
                                    autoComplete={step.uses2fa ? 'one-time-code' : 'current-password'}
                                    placeholder={step.placeholder}
                                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-amber-500"
                                />
                                <div className="flex gap-2">
                                    <button
                                        type="submit"
                                        disabled={revoke.isPending || verifying || !step.ready || !code}
                                        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                                    >
                                        {verifying || revoke.isPending
                                            ? 'Đang thu hồi...'
                                            : 'Xác nhận thu hồi'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setConfirmId(null);
                                            setErr(null);
                                        }}
                                        disabled={revoke.isPending}
                                        className="rounded-lg border border-stone-300 px-4 py-2 text-sm"
                                    >
                                        Hủy
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
