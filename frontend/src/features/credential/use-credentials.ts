'use client';
import { useQuery } from '@tanstack/react-query';
import { credentialApi } from './credential.api';
import type { CredentialsResponse } from '@/types';

export function useCredentials(initialData: CredentialsResponse) {
    return useQuery({
        queryKey: ['credentials'],
        queryFn: credentialApi.list,
        initialData,
    });
}