import Link from 'next/link';
import { redirect } from 'next/navigation';
import { serverFetch } from '@/libs/server-api';
import type { FakeVaultResponse } from '@/types';

export default async function FakePage() {
    const data = await serverFetch<FakeVaultResponse>('/recipe/fake');
    if (!data) redirect('/');

    const notes = data.notes ?? [];

    return (
        <div className="min-h-full bg-stone-50 text-stone-800">
            <nav className="flex items-center justify-between border-b border-stone-200 bg-white px-6 py-3">
                <span className="font-semibold">Ghi chú của tôi</span>
                <Link href="/" className="text-sm text-stone-500 hover:text-stone-700">Đóng</Link>
            </nav>

            <main className="mx-auto max-w-2xl px-6 py-10">
                <p className="text-xs uppercase tracking-widest text-stone-400">Ghi chú cá nhân</p>
                <h1 className="mb-6 text-2xl font-bold">Sổ tay</h1>
                <div className="space-y-3">
                    {notes.map((n: any, i: any) => (
                        <article key={i} className="rounded-xl bg-white p-4 shadow-sm">
                            <h3 className="font-medium">{n.title}</h3>
                            <p className="mt-1 text-sm text-stone-600">{n.body}</p>
                        </article>
                    ))}
                    {notes.length === 0 && <p className="text-stone-400">Chưa có ghi chú.</p>}
                </div>
            </main>
        </div>
    );
}