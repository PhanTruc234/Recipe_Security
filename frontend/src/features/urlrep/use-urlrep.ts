'use client';
import { useMutation } from '@tanstack/react-query';
import { urlRepApi } from './urlrep.api';

export function useUrlReputation() {
    return useMutation({
        mutationFn: ({ url, domain }: { url: string; domain: string }) => urlRepApi.check(url, domain),
    });
}