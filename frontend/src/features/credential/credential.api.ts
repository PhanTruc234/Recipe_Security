import { apiRequest, apiFetch } from '@/libs/api';
import type { CredentialsResponse, StepUp } from '@/types';
import type { Sealed } from '@/libs/crypto/aead';

export const credentialApi = {
    list: () => apiFetch<CredentialsResponse>({ url: '/credentials' }),
    create: (id: string, blob: Sealed) => apiRequest({ url: '/credentials', method: 'POST', data: { id, ...blob } }),
    update: (id: string, blob: Sealed) => apiRequest({ url: `/credentials/${id}`, method: 'PUT', data: blob }),
    remove: (id: string, s: StepUp) =>
        apiRequest({
            url: `/credentials/${id}`,
            method: 'DELETE',
            headers: s.code ? { 'x-2fa-code': s.code } : undefined,
            data: s.reauth ? { reauth: s.reauth } : undefined,
        }),
};