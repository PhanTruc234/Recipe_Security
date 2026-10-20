'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/auth.api';
import type { StepUp } from '@/types';

export function useDevices() {
    return useQuery({ queryKey: ['sessions'], queryFn: authApi.sessions });
}

export function useRevokeDevice() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ deviceId, stepUp }: { deviceId: string; stepUp: StepUp }) =>
            authApi.revokeSession(deviceId, stepUp),
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
