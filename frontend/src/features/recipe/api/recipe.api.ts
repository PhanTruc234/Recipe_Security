import { apiRequest } from '@/libs/api';
import type { SearchResponse } from '@/types';

export const recipeApi = {
    search: (query: string) =>
        apiRequest<SearchResponse>({ url: '/recipe/search', method: 'POST', data: { query } }),
};