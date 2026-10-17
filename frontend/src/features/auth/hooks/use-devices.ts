'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/auth.api';

export function useDevices() {
    return useQuery({ queryKey: ['sessions'], queryFn: authApi.sessions });
}

export function useRevokeDevice() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ deviceId, code }: { deviceId: string; code?: string }) =>
            authApi.revokeSession(deviceId, code),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
    });
}

export function useRenameDevice() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ deviceId, label }: { deviceId: string; label: string }) =>
            authApi.renameSession(deviceId, label),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
    });
}
