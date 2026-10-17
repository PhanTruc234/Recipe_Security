import Link from 'next/link';
import { serverFetch } from '@/libs/server-api';
import { LogoutButton } from '@/components/auth/LogoutButton';
import type { SessionInfo } from '@/types';
import { NewDeviceBanner } from '@/components/auth/NewDeviceBanner';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
    const session = await serverFetch<SessionInfo>('/auth/me');
    const isAdmin = session?.role === 'admin';

    return (
        <div className="min-h-screen bg-amber-50">
            <nav className="flex items-center justify-between border-b border-amber-100 bg-white px-6 py-3">
                <Link href="/vault" className="font-bold text-amber-700">🍲 Bếp Nhà</Link>
                <div className="flex items-center gap-2 text-sm">
                    <Link href="/vault" className="rounded-lg px-3 py-1.5 text-stone-600 hover:bg-amber-100">
                        Kho mật khẩu
                    </Link>
                    {isAdmin && (
                        <Link href="/admin" className="rounded-lg px-3 py-1.5 text-stone-600 hover:bg-amber-100">
                            Quản trị
                        </Link>
                    )}
                    <LogoutButton />
                </div>
            </nav>
            <main className="mx-auto max-w-4xl px-4 py-6">
                <NewDeviceBanner />
                {children}
            </main>
        </div>
    );
}