'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { credentialApi } from './credential.api';
import { encryptCredential, type CredentialData } from '@/libs/crypto/vault';
import { KeyStore } from '@/stores/key.store';

export function useSaveCredential() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ data, id }: { data: CredentialData; id?: string }) => {
            const key = KeyStore.getState().encryptionKey;
            if (!key) {
                throw new Error('Kho đang khóa — đăng nhập lại.');
            }
            const blob = await encryptCredential(key, data);
            const res = id ? await credentialApi.update(id, blob) : await credentialApi.create(blob);
            if (!res.ok) throw new Error(res.error ?? `Không lưu được (${res.status}).`);
            return res;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ['credentials'] }),
    });
}

export function useDeleteCredential() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, code }: { id: string; code?: string }) => {
            const res = await credentialApi.remove(id, code);
            if (!res.ok) throw new Error(res.error ?? 'Không xóa được.');
            return res;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ['credentials'] }),
    });
}