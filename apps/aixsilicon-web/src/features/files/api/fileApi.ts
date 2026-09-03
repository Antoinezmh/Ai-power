import { api } from '@/lib/api';
import { useAuthStore } from '@/features/auth/stores/authStore';

// ---------- 类型定义（与后端 app/schemas/file_asset.py 对齐） ----------

export interface FileDividion {
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

// 上传文件（multipart）：api 封装默认会注入 JSON Content-Type，
// 对于 FormData 必须让浏览器自动生成带 boundary 的 multipart 头，
// 因此这里单独用原生 fetch + store token，避免 Content-Type 被错误覆盖。
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

    const token = useAuthStore.getState().accessToken;
    const res = await fetch(`${BASE_URL}/api/v1/files/upload`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `HTTP ${res.status}`);
    }
    return res.json();
}

// 单分片上传（XHR，可获得上传进度）
function uploadChunkPart(uploadId: string, index: number, blob: Blob, onProgress?: (p: number) => void): Promise<void> {
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
        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) resolve();
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
// 小于 CHUNK_SIZE 的文件也走分片流程（统一逻辑），可等比聚合出整文件进度。
export const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB

export async function uploadChunkedFile(data: {
    file: File;
    group_name: string;
    func_type: string;
    namespace: string;
    tags?: string[];
    onProgress?: (percent: number) => void;
}): Promise<FileAsset> {
    const token = useAuthStore.getState().accessToken;
    const authHeaders: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
    const file = data.file;

    // 1. 初始化
    const initForm = new FormData();
    initForm.append('group_name', data.group_name);
    initForm.append('func_type', data.func_type);
    initForm.append('namespace', data.namespace);
    initForm.append('filename', file.name);
    initForm.append('size', String(file.size));
    const initRes = await fetch(`${BASE_URL}/api/v1/files/upload/chunk/init`, {
        method: 'POST', headers: authHeaders, body: initForm,
    });
    if (!initRes.ok) {
        const err = await initRes.json().catch(() => ({}));
        throw new Error(err.detail || `HTTP ${initRes.status}`);
    }
    const init = await initRes.json();
    const uploadId: string = init.upload_id;

    // 2. 切分并逐片上传
    const total = file.size || 1;
    const chunks = Math.max(1, Math.ceil(file.size / CHUNK_SIZE));
    let uploaded = 0;
    try {
        for (let i = 0; i < chunks; i++) {
            const start = i * CHUNK_SIZE;
            const blob = file.slice(start, start + CHUNK_SIZE);
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
        const compRes = await fetch(`${BASE_URL}/api/v1/files/upload/chunk/complete`, {
            method: 'POST', headers: authHeaders, body: compForm,
        });
        if (!compRes.ok) {
            const err = await compRes.json().catch(() => ({}));
            throw new Error(err.detail || `HTTP ${compRes.status}`);
        }
        data.onProgress?.(100);
        return compRes.json();
    } catch (e) {
        throw e;
    }
}

export const fileApi = {
    divisions: () => api.get<FileDividion[]>('/api/v1/files/divisions'),
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
    // 下载：用 fetch 拿 blob，前端触发浏览器保存
    download: async (id: string, filename: string) => {
        const token = useAuthStore.getState().accessToken;
        const res = await fetch(`${BASE_URL}/api/v1/files/${id}/download`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || `HTTP ${res.status}`);
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    },
    content: (id: string) => api.get<{ id: string; content: string }>(`/api/v1/files/${id}/content`),
    update: (id: string, data: FileUpdatePayload) =>
        api.patch<FileAsset>(`/api/v1/files/${id}`, data),
    remove: (id: string) => api.delete<{ success: boolean; message: string }>(`/api/v1/files/${id}`),
};
