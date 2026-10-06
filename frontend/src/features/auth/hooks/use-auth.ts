'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { computeAuthHash, KeyStore } from '@/stores/key.store';
import { generateKdfSalt } from '@/libs/crypto/kdf';
import { makeVerifier, checkVerifier } from '@/libs/crypto/vault';
import { authApi } from '../api/auth.api';

export function useRegister() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (input: { name: string; email: string; password: string }) => {
            const kdfSalt = generateKdfSalt();
            const { authHash, encryptionKey } = await computeAuthHash(input.password, kdfSalt);
            const verifier = await makeVerifier(encryptionKey);
            const res = await authApi.register({
                name: input.name,
                email: input.email,
                authHash,
                kdfSalt,
                verifier,
            });
            if (res.ok) {
                KeyStore.getState().setKey(encryptionKey);
                await qc.invalidateQueries({ queryKey: ['session'] });
            }
            return res;
        },
    });
}

export function useLogin() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (input: { email: string; password: string }) => {
            const params = await authApi.kdfParams(input.email);
            const { authHash, encryptionKey } = await computeAuthHash(input.password, params.kdfSalt);
            const res = await authApi.login({ email: input.email, authHash });

            if (res.ok && res.data?.verifier && (await checkVerifier(encryptionKey, res.data.verifier))) {
                KeyStore.getState().setKey(encryptionKey);
                await qc.invalidateQueries({ queryKey: ['session'] });
            }
            return res;
        },
    });
}

export function useVerify2fa() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (input: { code: string; password: string }) => {
            const res = await authApi.verify2fa(input.code);
            if (res.ok && res.data?.verifier && res.data.kdfSalt) {
                const { encryptionKey } = await computeAuthHash(input.password, res.data.kdfSalt);
                if (await checkVerifier(encryptionKey, res.data.verifier)) {
                    KeyStore.getState().setKey(encryptionKey);
                    await qc.invalidateQueries({ queryKey: ['session'] });
                }
            }
            return res;
        },
    });
}

export function useLogout() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async () => {
            await authApi.logout();
            KeyStore.getState().lock('manual');
            await qc.invalidateQueries({ queryKey: ['session'] });

        },
    });
}
export function useDismissAlert() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: () => authApi.dismissAlert(),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['session'] }),
    });
}