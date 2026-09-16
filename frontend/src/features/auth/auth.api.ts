import { apiRequest, apiFetch } from '@/libs/api';
import type {
    SessionInfo, KdfParams, KeyBundle, AuthResponse, RegisterPayload, LoginPayload,
} from '@/types';

export const authApi = {
    me: () => apiFetch<SessionInfo>({ url: '/auth/me' }),
    keys: () => apiFetch<KeyBundle>({ url: '/auth/keys' }),
    kdfParams: (email: string) =>
        apiFetch<KdfParams>({ url: '/auth/kdf-params', params: { email } }),
    register: (data: RegisterPayload) =>
        apiRequest<AuthResponse>({ url: '/auth/register', method: 'POST', data }),
    login: (data: LoginPayload) =>
        apiRequest<AuthResponse>({ url: '/auth/login', method: 'POST', data }),
    logout: () => apiRequest({ url: '/auth/logout', method: 'POST' }),
    verify2fa: (code: string) =>
        apiRequest<AuthResponse>({ url: '/auth/2fa/verify', method: 'POST', data: { code } }),
};