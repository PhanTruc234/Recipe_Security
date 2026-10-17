import { apiRequest } from '@/libs/api';

export interface ProviderResult {
    configured: boolean; ok: boolean; flagged: boolean; warn: boolean; detail: string;
}
export type RepLevel = 'clean' | 'warn' | 'danger' | 'unknown';
export interface UrlReputation {
    configured: boolean; message?: string; domain?: string; level?: RepLevel;
    safeBrowsing?: ProviderResult; virusTotal?: ProviderResult; cached?: boolean;
}

export const urlRepApi = {
    check: (url: string, domain: string) =>
        apiRequest<UrlReputation>({ url: '/url/reputation', method: 'POST', data: { url, domain } }),
};