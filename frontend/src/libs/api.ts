import axios, { type AxiosRequestConfig } from 'axios';
import { KeyStore } from '@/stores/key.store';

export interface ApiResult<T> {
    ok: boolean;
    status: number;
    data: T | null;
    error: string | null;
}

export class ApiError extends Error {
    constructor(
        public readonly status: number,
        public readonly code: string | null,
    ) {
        super(code ?? `HTTP ${status}`);
    }
}

const axiosClient = axios.create({
    baseURL: '/api',
    withCredentials: true,
    validateStatus: () => true,
});
axiosClient.interceptors.response.use((res) => {
    if (res.status === 440) KeyStore.getState().lock('server');
    return res;
});

export async function apiRequest<T>(config: AxiosRequestConfig): Promise<ApiResult<T>> {
    const res = await axiosClient.request<T>(config);
    const ok = res.status >= 200 && res.status < 300;
    const body = res.data as unknown;
    let error: string | null = null;
    if (!ok && body && typeof body === 'object' && 'message' in body) {
        const m = (body as { message?: unknown }).message;
        error = Array.isArray(m) ? String(m[0]) : typeof m === 'string' ? m : null;
    }

    return { ok, status: res.status, data: ok ? (body as T) : null, error };
}
export async function apiFetch<T>(config: AxiosRequestConfig): Promise<T> {
    const r = await apiRequest<T>(config);
    if (!r.ok || r.data === null) {
        throw new ApiError(r.status, r.error);
    }
    return r.data;
}