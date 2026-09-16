'use client';
import { useLogout } from '@/features/auth/hooks/use-auth';
import { useRouter } from 'next/navigation';

export function LogoutButton() {
    const router = useRouter();
    const logout = useLogout();
    return (
        <button
            onClick={async () => { await logout.mutateAsync(); router.replace('/'); }}
            className="rounded-lg border border-stone-300 px-4 py-2 text-sm"
        >
            Khóa lại
        </button>
    );
}