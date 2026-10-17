import { apiRequest, apiFetch } from '@/libs/api';
import type { CredentialsResponse } from '@/types';
import type { Sealed } from '@/libs/crypto/aead';

export const credentialApi = {
    list: () => apiFetch<CredentialsResponse>({ url: '/credentials' }),
    create: (blob: Sealed) => apiRequest({ url: '/credentials', method: 'POST', data: blob }),
    update: (id: string, blob: Sealed) => apiRequest({ url: `/credentials/${id}`, method: 'PUT', data: blob }),
    remove: (id: string, code?: string) =>
        apiRequest({ url: `/credentials/${id}`, method: 'DELETE', headers: code ? { 'x-2fa-code': code } : undefined }),
};