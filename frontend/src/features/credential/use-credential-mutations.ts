'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { credentialApi } from './credential.api';
import { encryptCredential, type CredentialData } from '@/libs/crypto/vault';
import { KeyStore } from '@/stores/key.store';
import type { StepUp } from '@/types';

export function useSaveCredential() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ data, id }: { data: CredentialData; id?: string }) => {
            const key = KeyStore.getState().encryptionKey;
            if (!key) {
                throw new Error('Kho đang khóa — đăng nhập lại.');
            }
            // Mục mới: client tự sinh id để AAD gắn được với id ngay lần mã hóa đầu
            const credId = id ?? crypto.randomUUID();
            const blob = await encryptCredential(key, credId, data);
            const res = id ? await credentialApi.update(id, blob) : await credentialApi.create(credId, blob);
            if (!res.ok) throw new Error(res.error ?? `Không lưu được (${res.status}).`);
            return res;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ['credentials'] }),
    });
}

export function useDeleteCredential() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, stepUp }: { id: string; stepUp: StepUp }) => {
            const res = await credentialApi.remove(id, stepUp);
            if (!res.ok) throw new Error(res.error ?? 'Không xóa được.');
            return res;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ['credentials'] }),
    });
}