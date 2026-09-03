import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { favoriteApi } from '../api/favoriteApi';

export const FAVORITES_QUERY_KEY = 'favorites';

export function useFavorites() {
    return useQuery({
        queryKey: [FAVORITES_QUERY_KEY],
        queryFn: favoriteApi.list,
        staleTime: 60 * 1000,
    });
}

export function useToggleFavorite() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ toolId, isFavorite }: { toolId: string; isFavorite: boolean }) =>
            isFavorite ? favoriteApi.remove(toolId) : favoriteApi.add(toolId),
        onSuccess: () => {
            // 同时刷新收藏列表和工具列表（因为工具列表中的收藏状态可能变化）
            queryClient.invalidateQueries({ queryKey: [FAVORITES_QUERY_KEY] });
            queryClient.invalidateQueries({ queryKey: ['tools'] });
        },
    });
}