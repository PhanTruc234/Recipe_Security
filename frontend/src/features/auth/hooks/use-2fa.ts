'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/auth.api';


export function use2faStatus() {
    return useQuery({ queryKey: ['2fa-status'], queryFn: authApi.twofaStatus });
}

export function useSetup2fa() {
    return useMutation({ mutationFn: () => authApi.twofaSetup() });
}

export function useEnable2fa() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (code: string) => authApi.twofaEnable(code),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['2fa-status'] }),
    });
}

export function useDisable2fa() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (code: string) => authApi.twofaDisable(code),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['2fa-status'] }),
    });
}