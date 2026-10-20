'use client';
import { useState } from 'react';
import { useStepUp } from '@/features/auth/hooks/use-step-up';
import type { StepUp } from '@/types';

export function DeleteConfirm({ service, busy, error, onConfirm, onCancel }: {
    service: string; busy: boolean; error?: string | null;
    onConfirm: (stepUp: StepUp) => void; onCancel: () => void;
}) {
    const step = useStepUp();
    const [secret, setSecret] = useState('');
    const [deriving, setDeriving] = useState(false);
    const [localError, setLocalError] = useState('');

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLocalError('');
        setDeriving(true);
        try {
            onConfirm(await step.build(secret));
        } catch {
            setLocalError('Không xác minh được, thử lại.');
        } finally {
            setDeriving(false);
            setSecret('');
        }
    }

    const shownError = localError || error;
    return (
        <div className="rounded-xl border border-red-200 bg-red-50/50 p-4">
            <h3 className="font-semibold">Xóa mục &quot;{service}&quot;?</h3>
            <p className="mt-1 text-sm text-stone-600">Server chỉ giữ bản mã hóa — xóa xong <strong>không ai khôi phục được</strong>.</p>
            {shownError && <div className="mt-2 rounded-lg bg-red-100 px-3 py-2 text-sm text-red-700">{shownError}</div>}
            <form onSubmit={onSubmit} className="mt-3 space-y-2">
                <input value={secret} onChange={(e) => setSecret(e.target.value)} required
                    type={step.uses2fa ? 'text' : 'password'}
                    inputMode={step.uses2fa ? 'numeric' : undefined}
                    autoComplete={step.uses2fa ? 'one-time-code' : 'current-password'}
                    placeholder={step.placeholder}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-amber-500" />
                <div className="flex gap-2">
                    <button type="submit" disabled={busy || deriving || !step.ready}
                        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
                        {deriving ? 'Đang xác minh...' : busy ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
                    </button>
                    <button type="button" onClick={onCancel} disabled={busy || deriving} className="rounded-lg border border-stone-300 px-4 py-2 text-sm">Hủy</button>
                </div>
            </form>
        </div>
    );
}
