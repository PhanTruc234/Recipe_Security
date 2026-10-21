'use client';
import { useEffect, useMemo, useState } from 'react';
import { KeyStore } from '@/stores/key.store';
import { useCredentials } from '@/features/credential/use-credentials';
import { useSaveCredential, useDeleteCredential } from '@/features/credential/use-credential-mutations';
import { useQueryClient } from '@tanstack/react-query';
import { decryptRows, upgradeLegacyItems, type VaultItem } from '@/features/credential/decrypt';
import { UnlockScreen } from './UnlockScreen';
import { CredentialForm } from './CredentialForm';
import { DeleteConfirm } from './DeleteConfirm';
import type { CredentialsResponse, StepUp } from '@/types';
import type { CredentialData } from '@/libs/crypto/vault';
import { TwoFactorSettings } from './TwoFactorSettings';
import { QuickUnlockSettings } from './QuickUnlockSettings';
import { RevealAuthModal } from './RevealAuthModal';
import { useScanBreaches } from '@/features/credential/use-scan-breaches';
import { VaultHealth } from './VaultHealth';
import { useAutoLock } from '@/features/auth/hooks/use-auto-lock';
import { copyWithAutoClear } from '@/libs/clipboard';
type GuardedAction = 'reveal' | 'copy' | 'edit';

export function VaultClient({ initialCredentials }: { initialCredentials: CredentialsResponse }) {
    const unlocked = KeyStore((s) => s.unlocked);
    if (!unlocked) return <UnlockScreen />;
    return <VaultContent initialCredentials={initialCredentials} />;
}

function VaultContent({ initialCredentials }: { initialCredentials: CredentialsResponse }) {
    const { data: rows } = useCredentials(initialCredentials);
    const save = useSaveCredential();
    const del = useDeleteCredential();

    const [items, setItems] = useState<VaultItem[]>([]);
    const [query, setQuery] = useState('');
    const [editing, setEditing] = useState<VaultItem | null>(null);
    const [creating, setCreating] = useState(false);
    const [deleting, setDeleting] = useState<VaultItem | null>(null);
    const [revealed, setRevealed] = useState<string | null>(null);
    const [authPrompt, setAuthPrompt] = useState<{ item: VaultItem; action: GuardedAction } | null>(null);
    const [toast, setToast] = useState('');
    const [failed, setFailed] = useState(0);
    const qc = useQueryClient();
    const { scan, scanning, progress } = useScanBreaches();
    useAutoLock(true);

    const signature = useMemo(() => rows.credentials.map((c) => `${c.id}:${c.updatedAt}`).join(','), [rows]);
    useEffect(() => {
        const key = KeyStore.getState().encryptionKey;
        if (!key) return;
        let cancelled = false;
        decryptRows(key, rows.credentials).then(async ({ items: list, failed: bad }) => {
            if (cancelled) return;
            setItems(list);
            setFailed(bad);
            if (list.some((i) => i.legacy) && (await upgradeLegacyItems(key, list)) > 0) {
                await qc.invalidateQueries({ queryKey: ['credentials'] });
            }
        });
        return () => { cancelled = true; };
    }, [rows.credentials, signature, qc]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return items;
        return items.filter((i) =>
            i.service.toLowerCase().includes(q) || i.username.toLowerCase().includes(q) || i.url.toLowerCase().includes(q));
    }, [items, query]);

    async function onSave(d: CredentialData): Promise<boolean> {
        try { await save.mutateAsync({ data: d, id: editing?.id }); setEditing(null); setCreating(false); return true; }
        catch { return false; }
    }
    async function onConfirmDelete(stepUp: StepUp) {
        if (!deleting) return;
        try { await del.mutateAsync({ id: deleting.id, stepUp }); setDeleting(null); } catch { }
    }
    async function onCopy(text: string, label: string) {
        const ok = await copyWithAutoClear(text, 15);
        setToast(ok ? `Đã chép ${label} — clipboard tự xóa sau 15 giây` : 'Trình duyệt không cho phép chép');
        setTimeout(() => setToast(''), 4000);
    }

    function runAction(item: VaultItem, action: GuardedAction) {
        if (action === 'reveal') setRevealed(item.id);
        else if (action === 'copy') void onCopy(item.password, 'mật khẩu');
        else { setEditing(item); setCreating(false); }
    }

    // Mọi đường lộ mật khẩu (Hiện / Chép / Sửa) đi qua cùng một cổng xác thực.
    // Lưu ý: đây là lớp chống nhìn trộm trên giao diện — dữ liệu đã giải mã trong RAM.
    function guarded(item: VaultItem, action: GuardedAction) {
        if (item.requireRevealAuth && item.requireRevealAuth !== 'none') {
            setAuthPrompt({ item, action });
            return;
        }
        runAction(item, action);
    }

    function handleToggleReveal(item: VaultItem) {
        if (revealed === item.id) {
            setRevealed(null);
            return;
        }
        guarded(item, 'reveal');
    }

    return (
        <div>
            <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">{items.length} mục</h2>
                <div className="flex gap-2">
                    <input type="search" placeholder="Tìm dịch vụ/tài khoản..." value={query} onChange={(e) => setQuery(e.target.value)}
                        className="rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-amber-500" />
                    <button onClick={() => { setCreating(true); setEditing(null); }} className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white">+ Thêm</button>
                </div>
            </div>

            {failed > 0 && (
                <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                    {failed} mục không giải mã/xác thực được — có thể đã bị sửa hoặc tráo trên server.
                </div>
            )}
            {save.isError &&<div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{(save.error as Error).message}</div>}
            {toast && <div className="mb-3 rounded-lg bg-stone-800 px-3 py-2 text-sm text-white">{toast}</div>}
            {deleting && (
                <div className="mb-4">
                    <DeleteConfirm service={deleting.service} busy={del.isPending} error={del.error ? (del.error as Error).message : null}
                        onConfirm={onConfirmDelete} onCancel={() => { setDeleting(null); del.reset(); }} />
                </div>
            )}

            {(creating || editing) && (
                <div className="mb-4">
                    <h3 className="mb-2 font-medium">{editing ? 'Sửa mục' : 'Thêm mục mới'}</h3>
                    <CredentialForm initial={editing ?? undefined} busy={save.isPending} onSave={onSave}
                        onCancel={() => { setCreating(false); setEditing(null); }} />
                </div>
            )}
            <div className="mb-4">
                <VaultHealth items={items} onScan={() => scan(rows.credentials)} scanning={scanning} progress={progress} />
            </div>
            <div className="space-y-3">
                {filtered.length === 0 && <div className="rounded-lg bg-white p-6 text-center text-stone-400">{items.length === 0 ? 'Kho trống. Bấm "+ Thêm".' : 'Không tìm thấy.'}</div>}
                {filtered.map((item) => (
                    <article key={item.id} className="rounded-xl bg-white p-4 shadow-sm">
                        <div className="flex items-start justify-between">
                            <div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="font-medium">{item.service}</h3>
                                    {(item.breachCount ?? 0) > 0 && (
                                        <span className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-700">Đã bị lộ</span>
                                    )}
                                    {item.reused && (
                                        <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-700">Dùng lại</span>
                                    )}
                                    {item.strength.level === 'yeu' && (
                                        <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-700">Yếu</span>
                                    )}
                                    {item.requireRevealAuth === 'bio' && (
                                        <span title="Yêu cầu Touch ID / Vân tay khi xem" className="inline-flex items-center justify-center rounded-md border border-purple-200 bg-purple-50 p-1 text-purple-600">
                                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 004.07 9.29m4.878 12.155A20.06 20.06 0 014 11" />
                                            </svg>
                                        </span>
                                    )}
                                    {item.requireRevealAuth === 'pin' && (
                                        <span title="Yêu cầu Mã PIN khi xem" className="inline-flex items-center justify-center rounded-md border border-blue-200 bg-blue-50 p-1 text-blue-600">
                                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                            </svg>
                                        </span>
                                    )}
                                    {item.requireRevealAuth === 'quick' && (
                                        <span title="Yêu cầu Mở khóa nhanh khi xem" className="inline-flex items-center justify-center rounded-md border border-indigo-200 bg-indigo-50 p-1 text-indigo-600">
                                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                            </svg>
                                        </span>
                                    )}
                                </div>
                                {item.url && <span className="text-xs text-stone-400">{item.url}</span>}
                            </div>
                            <div className="flex gap-3 text-sm">
                                <button onClick={() => guarded(item, 'edit')} className="text-amber-700">Sửa</button>
                                <button onClick={() => setDeleting(item)} className="text-red-600">Xóa</button>
                            </div>
                        </div>
                        {item.username && (
                            <div className="mt-2 flex items-center gap-2 text-sm">
                                <span className="w-20 text-stone-400">Tài khoản</span>
                                <code className="rounded bg-stone-100 px-2 py-0.5">{item.username}</code>
                                <button onClick={() => onCopy(item.username, 'tài khoản')} className="text-xs text-amber-700">Chép</button>
                            </div>
                        )}
                        <div className="mt-1 flex items-center gap-2 text-sm">
                            <span className="w-20 text-stone-400">Mật khẩu</span>
                            <code className="rounded bg-stone-100 px-2 py-0.5">{revealed === item.id ? item.password : '•'.repeat(10)}</code>
                            <button onClick={() => handleToggleReveal(item)} className="text-xs text-amber-700">{revealed === item.id ? 'Ẩn' : 'Hiện'}</button>
                            <button onClick={() => guarded(item, 'copy')} className="text-xs text-amber-700">Chép</button>
                        </div>
                        {item.note && <p className="mt-2 text-sm text-stone-600">{item.note}</p>}
                    </article>
                ))}
            </div>

            {authPrompt && (
                <RevealAuthModal
                    item={authPrompt.item}
                    onSuccess={() => {
                        runAction(authPrompt.item, authPrompt.action);
                        setAuthPrompt(null);
                    }}
                    onCancel={() => setAuthPrompt(null)}
                />
            )}

            <QuickUnlockSettings />
            <TwoFactorSettings />
        </div>
    );
}