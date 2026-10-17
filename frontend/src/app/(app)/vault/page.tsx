import { headers } from 'next/headers';
import type { CredentialsResponse } from '@/types';
import { VaultClient } from '@/components/vault/VaultClient';

const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:3000';

async function getCredentials(): Promise<CredentialsResponse> {
    const cookie = (await headers()).get('cookie') ?? '';
    try {
        const res = await fetch(`${BACKEND}/api/credentials`, { headers: { cookie }, cache: 'no-store' });
        if (!res.ok) return { credentials: [] };
        return await res.json();
    } catch {
        return { credentials: [] };
    }
}

export default async function VaultPage() {
    const initial = await getCredentials();
    return <VaultClient initialCredentials={initial} />;
}