import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toolApi, ToolListParams, Tool } from '../api/toolsApi';

export const TOOLS_QUERY_KEY = 'tools';

// ---- 工具列表（无限滚动，保留旧数据） ----
export function useToolsInfinite(params: Omit<ToolListParams, 'skip' | 'limit'>) {
    return useInfiniteQuery({
        queryKey: [TOOLS_QUERY_KEY, params],
        queryFn: ({ pageParam = 0 }) =>
            toolApi.list({ ...params, skip: pageParam, limit: 6 }),
        initialPageParam: 0,
        getNextPageParam: (lastPage, allPages) => {
            if (lastPage.length < 6) return undefined;
            return allPages.length * 6;
        },
        staleTime: 60 * 1000,
        placeholderData: (previousData) => previousData, // 防止闪烁
    });
}

// ---- 工具分类及数量 ----
export function useToolCategories() {
    return useQuery({
        queryKey: [TOOLS_QUERY_KEY, 'categories'],
        queryFn: toolApi.getCategories,
        staleTime: 5 * 60 * 1000,
    });
}

// ---- 单个工具 ----
export function useTool(id: string) {
    return useQuery({
        queryKey: [TOOLS_QUERY_KEY, id],
        queryFn: () => toolApi.get(id),
        enabled: !!id,
        staleTime: 60 * 1000,
    });
}

// ---- 创建工具 ----
export function useCreateTool() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: toolApi.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [TOOLS_QUERY_KEY] });
        },
    });
}

// ---- 更新工具 ----
export function useUpdateTool() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<Tool> }) =>
            toolApi.update(id, data),
        onSuccess: (_, { id }) => {
            queryClient.invalidateQueries({ queryKey: [TOOLS_QUERY_KEY] });
            queryClient.invalidateQueries({ queryKey: [TOOLS_QUERY_KEY, id] });
        },
    });
}

// ---- 删除工具 ----
export function useDeleteTool() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: toolApi.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [TOOLS_QUERY_KEY] });
        },
    });
}

// ---- 使用工具（计数 + 失效仪表盘缓存） ----
export function useUseTool() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: toolApi.use,
        onSuccess: (_, id) => {
            queryClient.invalidateQueries({ queryKey: [TOOLS_QUERY_KEY] });
            queryClient.invalidateQueries({ queryKey: [TOOLS_QUERY_KEY, id] });
            // 使仪表盘统计失效，以便下次刷新时重新获取
            queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
        },
        onError: (error) => {
            console.error('使用工具失败:', error);
        },
    });
}