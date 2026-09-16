'use client';

import { useQuery } from '@tanstack/react-query';
import { authApi } from '../api/auth.api';



export function useSession() {
    const query = useQuery({
        queryKey: ['session'],
        queryFn: authApi.me,
    });
    return {
        session: query.data,
        isLoading: query.isLoading,
        error: query.error,
        refetch: query.refetch,
    };
}