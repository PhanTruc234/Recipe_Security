import { headers } from 'next/headers';

const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:3000';

export async function serverFetch<T>(path: string): Promise<T | null> {
    const cookie = (await headers()).get('cookie') ?? '';
    try {
        const res = await fetch(`${BACKEND}/api${path}`, { headers: { cookie }, cache: 'no-store' });
        if (!res.ok) return null;
        return (await res.json()) as T;
    } catch {
        return null;
    }
}