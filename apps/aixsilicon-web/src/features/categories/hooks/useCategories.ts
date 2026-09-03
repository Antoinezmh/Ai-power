import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoryApi, Category } from '../api/categoryApi';

export const CATEGORIES_QUERY_KEY = 'categories';

export function useCategoryTree() {
    return useQuery({
        queryKey: [CATEGORIES_QUERY_KEY, 'tree'],
        queryFn: categoryApi.getTree,
        staleTime: 5 * 60 * 1000,
    });
}

export function useCreateCategory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: categoryApi.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [CATEGORIES_QUERY_KEY] });
            // 同时刷新工具列表（因为分类变化可能影响工具分类显示）
            queryClient.invalidateQueries({ queryKey: ['tools'] });
        },
    });
}

export function useUpdateCategory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<Category> }) =>
            categoryApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [CATEGORIES_QUERY_KEY] });
            queryClient.invalidateQueries({ queryKey: ['tools'] });
        },
    });
}

export function useDeleteCategory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: categoryApi.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [CATEGORIES_QUERY_KEY] });
            queryClient.invalidateQueries({ queryKey: ['tools'] });
        },
    });
}