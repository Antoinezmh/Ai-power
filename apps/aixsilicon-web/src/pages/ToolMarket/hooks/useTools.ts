import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTools, getTool, ToolListParams } from '../api/toolApi';

export const TOOLS_QUERY_KEY = 'tools';

export function useToolsInfinite(params: Omit<ToolListParams, 'skip' | 'limit'>) {
    return useInfiniteQuery({
        queryKey: [TOOLS_QUERY_KEY, params],
        queryFn: ({ pageParam = 0 }) =>
            getTools({ ...params, skip: pageParam, limit: 6 }),
        initialPageParam: 0,
        getNextPageParam: (lastPage, allPages) => {
            if (lastPage.length < 6) return undefined;
            return allPages.length * 6;
        },
        staleTime: 5 * 60 * 1000,
    });
}

export function useTool(id: string) {
    return useQuery({
        queryKey: [TOOLS_QUERY_KEY, id],
        queryFn: () => getTool(id),
        enabled: !!id,
    });
}

export function useUseTool() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: useTool,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [TOOLS_QUERY_KEY] });
        },
    });
}