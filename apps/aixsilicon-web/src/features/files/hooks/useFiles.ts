import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    fileApi,
    uploadFile,
    FileAsset,
    FileDividion,
    FileUpdatePayload,
    FileScopesView,
} from '../api/fileApi';

export const FILES_QUERY_KEY = 'files';
export const FILE_DIVISIONS_QUERY_KEY = 'file-divisions';
export const FILE_SCOPES_QUERY_KEY = 'file-scopes';

export interface FileListParams {
    group_name?: string;
    func_type?: string;
    namespace?: string;
    keyword?: string;
    archived?: boolean;
    page?: number;
    page_size?: number;
}

// 八组 × 三型 目录结构
export function useFileDivisions() {
    return useQuery<FileDividion[]>({
        queryKey: [FILE_DIVISIONS_QUERY_KEY],
        queryFn: fileApi.divisions,
        staleTime: 30 * 60 * 1000,
    });
}

// 当前用户可见作用域（分组/功能型/工具 + 访问级别），用于过滤空间与操作按钮
export function useFileScopes() {
    return useQuery<FileScopesView>({
        queryKey: [FILE_SCOPES_QUERY_KEY],
        queryFn: fileApi.scopes,
        staleTime: 30 * 60 * 1000,
    });
}

// 文件清单（分页 + 筛选）
export function useFileList(params: FileListParams) {
    return useQuery({
        queryKey: [FILES_QUERY_KEY, 'list', params],
        queryFn: () => fileApi.list(params),
        placeholderData: (prev) => prev,
    });
}

// 已有工具空间（用于上传/筛选下拉的 namespace 聚合）
export function useFileTree(params?: { group_name?: string; func_type?: string; namespace?: string }) {
    return useQuery({
        queryKey: [FILES_QUERY_KEY, 'tree', params],
        queryFn: () => fileApi.tree(params),
    });
}

function invalidateFiles(queryClient: ReturnType<typeof useQueryClient>) {
    queryClient.invalidateQueries({ queryKey: [FILES_QUERY_KEY] });
    queryClient.invalidateQueries({ queryKey: [FILE_DIVISIONS_QUERY_KEY] });
    queryClient.invalidateQueries({ queryKey: [FILE_SCOPES_QUERY_KEY] });
}

// 上传
export function useUploadFile() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: uploadFile,
        onSuccess: () => invalidateFiles(queryClient),
    });
}

// 更新（重命名/移动/标签/归档）
export function useUpdateFile() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: FileUpdatePayload }) =>
            fileApi.update(id, data),
        onSuccess: () => invalidateFiles(queryClient),
    });
}

// 删除
export function useDeleteFile() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => fileApi.remove(id),
        onSuccess: () => invalidateFiles(queryClient),
    });
}

export type { FileAsset };
