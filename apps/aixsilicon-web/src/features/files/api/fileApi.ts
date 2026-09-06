import { api, apiRequest, refreshAccessToken } from '@/lib/api';
import { useAuthStore } from '@/features/auth/stores/authStore';

// ---------- 类型定义（与后端 app/schemas/file_asset.py 对齐） ----------

export interface FileDivision {
    group_name: string;
    func_types: string[];
}

export interface FileAsset {
    id: string;
    group_name: string;
    func_type: string;
    namespace: string;
    filename: string;
    ext?: string | null;
    size: number;
    mime?: string | null;
    storage_path: string;
    tags?: string[] | null;
    is_archived: boolean;
    owner_id?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
}

export interface FileListResult {
    total: number;
    page: number;
    page_size: number;
    items: FileAsset[];
}

export interface FileNode {
    id: string;
    filename: string;
    size: number;
    mime?: string | null;
    ext?: string | null;
    storage_path: string;
    is_archived: boolean;
    created_at?: string | null;
}

export interface FileToolNode {
    namespace: string;
    file_count: number;
    files: FileNode[];
}

export interface FileFuncNode {
    func_type: string;
    tools: FileToolNode[];
}

export interface FileGroupNode {
    group: string;
    func_types: FileFuncNode[];
}

export interface FileUpdatePayload {
    filename?: string;
    group_name?: string;
    func_type?: string;
    namespace?: string;
    tags?: string[];
    is_archived?: boolean;
}

// 前端权限作用域（与后端 file_permission_service.user_scope_view 对齐）
export interface FileScopeTool {
    namespace: string;
    access_level: 'read' | 'write' | 'manage';
}
export interface FileScopeFunc {
    func_type: string;
    access_level: 'read' | 'write' | 'manage';
    tools: FileScopeTool[] | null;
}
export interface FileScopeGroup {
    group_name: string;
    access_level: 'read' | 'write' | 'manage';
    func_types: FileScopeFunc[];
}
export interface FileScopesView {
    is_admin: boolean;
    groups: FileScopeGroup[];
}

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// 上传文件（multipart）：统一请求层会保留 FormData，
// 并让浏览器自动生成带 boundary 的 Content-Type。
export async function uploadFile(data: {
    file: File;
    group_name: string;
    func_type: string;
    namespace: string;
    tags?: string[];
}): Promise<FileAsset> {
    const form = new FormData();
    form.append('group_name', data.group_name);
    form.append('func_type', data.func_type);
    form.append('namespace', data.namespace);
    if (data.tags && data.tags.length) {
        form.append('tags', data.tags.join(','));
    }
    form.append('file', data.file);

    return apiRequest<FileAsset>('/api/v1/files/upload', {
        method: 'POST',
        body: form,
    });
}

// 单分片上传（XHR，可获得上传进度）
function uploadChunkPart(uploadId: string, index: number, blob: Blob, onProgress?: (p: number) => void, retried = false): Promise<void> {
    return new Promise((resolve, reject) => {
        const token = useAuthStore.getState().accessToken;
        const form = new FormData();
        form.append('upload_id', uploadId);
        form.append('index', String(index));
        form.append('file', blob, 'part');
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${BASE_URL}/api/v1/files/upload/chunk`);
        if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total);
        };
        xhr.onload = async () => {
            if (xhr.status >= 200 && xhr.status < 300) resolve();
            else if (xhr.status === 401 && !retried && await refreshAccessToken()) {
                try {
                    await uploadChunkPart(uploadId, index, blob, onProgress, true);
                    resolve();
                } catch (error) {
                    reject(error);
                }
            }
            else {
                let detail = `HTTP ${xhr.status}`;
                try { detail = JSON.parse(xhr.responseText).detail || detail; } catch { /* ignore */ }
                reject(new Error(detail));
            }
        };
        xhr.onerror = () => reject(new Error('网络错误，分片上传失败'));
        xhr.send(form);
    });
}

// 分片上传完整流程：init -> 逐片上传(带进度) -> complete
// 大于 CHUNK_SIZE 的文件走分片流程，可等比聚合出整文件进度。
export const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB

export async function uploadChunkedFile(data: {
    file: File;
    group_name: string;
    func_type: string;
    namespace: string;
    tags?: string[];
    onProgress?: (percent: number) => void;
}): Promise<FileAsset> {
    const file = data.file;

    // 1. 初始化
    const initForm = new FormData();
    initForm.append('group_name', data.group_name);
    initForm.append('func_type', data.func_type);
    initForm.append('namespace', data.namespace);
    initForm.append('filename', file.name);
    initForm.append('size', String(file.size));
    const init = await apiRequest<{ upload_id: string; chunk_size: number }>('/api/v1/files/upload/chunk/init', {
        method: 'POST', body: initForm,
    });
    const uploadId: string = init.upload_id;
    const chunkSize: number = init.chunk_size || CHUNK_SIZE;

    // 2. 切分并逐片上传
    const total = file.size || 1;
    const chunks = Math.max(1, Math.ceil(file.size / chunkSize));
    let uploaded = 0;
    for (let i = 0; i < chunks; i++) {
        const start = i * chunkSize;
        const blob = file.slice(start, start + chunkSize);
        await uploadChunkPart(uploadId, i, blob, (partP) => {
            const loadedBytes = uploaded + partP * blob.size;
            data.onProgress?.(Math.min(99, (loadedBytes / total) * 100));
        });
        uploaded += blob.size;
        data.onProgress?.(Math.min(99, (uploaded / total) * 100));
    }

    // 3. 合并完成
    const compForm = new FormData();
    compForm.append('upload_id', uploadId);
    compForm.append('group_name', data.group_name);
    compForm.append('func_type', data.func_type);
    compForm.append('namespace', data.namespace);
    compForm.append('filename', file.name);
    if (data.tags && data.tags.length) compForm.append('tags', data.tags.join(','));
    const result = await apiRequest<FileAsset>('/api/v1/files/upload/chunk/complete', {
        method: 'POST', body: compForm,
    });
    data.onProgress?.(100);
    return result;
}

export const fileApi = {
    divisions: () => api.get<FileDivision[]>('/api/v1/files/divisions'),
    scopes: () => api.get<FileScopesView>('/api/v1/files/scopes'),
    list: (params: {
        group_name?: string;
        func_type?: string;
        namespace?: string;
        keyword?: string;
        archived?: boolean;
        page?: number;
        page_size?: number;
    }) => {
        const qs = new URLSearchParams();
        if (params.group_name) qs.set('group_name', params.group_name);
        if (params.func_type) qs.set('func_type', params.func_type);
        if (params.namespace) qs.set('namespace', params.namespace);
        if (params.keyword) qs.set('keyword', params.keyword);
        if (params.archived !== undefined) qs.set('archived', String(params.archived));
        if (params.page) qs.set('page', String(params.page));
        if (params.page_size) qs.set('page_size', String(params.page_size));
        const q = qs.toString();
        return api.get<FileListResult>(`/api/v1/files${q ? `?${q}` : ''}`);
    },
    tree: (params?: { group_name?: string; func_type?: string; namespace?: string }) => {
        const qs = new URLSearchParams();
        if (params?.group_name) qs.set('group_name', params.group_name);
        if (params?.func_type) qs.set('func_type', params.func_type);
        if (params?.namespace) qs.set('namespace', params.namespace);
        const q = qs.toString();
        return api.get<FileGroupNode[]>(`/api/v1/files/tree${q ? `?${q}` : ''}`);
    },
    // 下载：先获取 2 分钟有效的票据，再交给浏览器原生下载，避免整文件进入 JS 内存。
    download: async (id: string, _filename: string) => {
        const ticket = await api.post<{ url: string; expires_in: number }>(`/api/v1/files/${id}/download-ticket`);
        const base = BASE_URL.replace(/\/$/, '');
        const a = document.createElement('a');
        a.href = `${base}${ticket.url}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
    },
    content: (id: string) => api.get<{ id: string; content: string }>(`/api/v1/files/${id}/content`),
    update: (id: string, data: FileUpdatePayload) =>
        api.patch<FileAsset>(`/api/v1/files/${id}`, data),
    remove: (id: string) => api.delete<{ success: boolean; message: string }>(`/api/v1/files/${id}`),
};
