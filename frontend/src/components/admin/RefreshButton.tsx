'use client';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

export function RefreshButton() {
    const router = useRouter();
    const [pending, start] = useTransition();
    return (
        <button onClick={() => start(() => router.refresh())} disabled={pending}
            className="rounded-lg border border-stone-300 px-4 py-2 text-sm disabled:opacity-60">
            {pending ? 'Đang tải...' : 'Kiểm tra lại'}
        </button>
    );
}