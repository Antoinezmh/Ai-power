// lib/api.ts
import { useAuthStore } from '@/features/auth/stores/authStore';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// 扩展 RequestInit，增加可选的 token 字段
interface ApiRequestOptions extends RequestInit {
    token?: string; // 显式传入的 token，优先级高于 store 中的 token
}

// 保存“正在刷新 token”的 Promise，用于并发去重（single-flight），
// 避免同一时间多个 401 请求各自触发重复的 refresh 请求
let refreshPromise: Promise<boolean> | null = null;

// 调用 refresh 端点换取新 token，成功则更新 store
async function doRefreshToken(): Promise<boolean> {
    const state = useAuthStore.getState();
    const refreshToken = state.refreshToken;
    if (!refreshToken) {
        useAuthStore.getState().clearAuth();
        return false;
    }
    try {
        const res = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refreshToken }),
        });
        if (!res.ok) {
            useAuthStore.getState().clearAuth();
            return false;
        }
        const data = await res.json();
        if (data.access_token && data.refresh_token) {
            useAuthStore.getState().setTokens(data.access_token, data.refresh_token);
            return true;
        }
        useAuthStore.getState().clearAuth();
        return false;
    } catch {
        useAuthStore.getState().clearAuth();
        return false;
    }
}

// 单例式刷新：同一时刻只有一个 refresh 请求，其他调用等待其结果
function refreshTokenOnce(): Promise<boolean> {
    if (!refreshPromise) {
        refreshPromise = doRefreshToken().finally(() => {
            refreshPromise = null;
        });
    }
    return refreshPromise;
}

// 出现未授权（token 失效）时，刷新 token 并重试；刷新失败则清空并跳转登录页
function handleUnauthorized(): void {
    // 延迟到当前同步流程结束，避免在 render/事件过程中直接跳转
    setTimeout(() => {
        // 仅当确实已登出（无 token）时才跳转，避免影响还在刷新的情况
        const state = useAuthStore.getState();
        if (!state.accessToken && !window.location.pathname.includes('/login')) {
            // 保留当前路径，登录后可以跳回
            const current = window.location.pathname + window.location.search;
            window.location.href = `/login?redirect=${encodeURIComponent(current)}`;
        }
    }, 0);
}

export async function apiRequest<T>(
    endpoint: string,
    options: ApiRequestOptions = {}
): Promise<T> {
    const url = `${BASE_URL}${endpoint}`;
    const storeToken = useAuthStore.getState().accessToken;
    const token = options.token ?? storeToken;

    // 使用 Headers 对象处理所有请求头，类型安全且支持 set/get
    const headers = new Headers(options.headers);

    // 设置默认 Content-Type（如果未手动指定）
    if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    // 如果存在 token，设置 Authorization 头
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(url, {
        ...options,
        headers,
    });

    // 401：尝试刷新 token 并重试一次
    if (response.status === 401) {
        // login / refresh 端点本身失败不进行重试，避免死循环
        const isAuthEndpoint =
            endpoint.includes('/auth/login') || endpoint.includes('/auth/refresh');
        if (!isAuthEndpoint) {
            const refreshed = await refreshTokenOnce();
            if (refreshed) {
                // 用新 token 重放原请求
                const newToken = useAuthStore.getState().accessToken;
                const retryHeaders = new Headers(options.headers);
                if (!retryHeaders.has('Content-Type')) {
                    retryHeaders.set('Content-Type', 'application/json');
                }
                if (newToken) {
                    retryHeaders.set('Authorization', `Bearer ${newToken}`);
                }
                const retryRes = await fetch(url, {
                    ...options,
                    headers: retryHeaders,
                });
                if (retryRes.ok) {
                    if (retryRes.status === 204) {
                        return {} as T;
                    }
                    return retryRes.json() as Promise<T>;
                }
                if (retryRes.status === 401) {
                    // 重试后仍然 401，说明刷新也无效，跳转登录
                    handleUnauthorized();
                }
                const retryErrorData = await retryRes.json().catch(() => ({}));
                throw new Error(retryErrorData.detail || `HTTP ${retryRes.status}`);
            } else {
                // 刷新失败，跳转登录页
                handleUnauthorized();
            }
        }
    }

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP ${response.status}`);
    }

    if (response.status === 204) {
        return {} as T;
    }

    return response.json() as Promise<T>;
}

// 封装常用 HTTP 方法，每个方法都支持传递 token
export const api = {
    get: <T>(endpoint: string, options?: ApiRequestOptions) =>
        apiRequest<T>(endpoint, { ...options, method: 'GET' }),

    post: <T>(endpoint: string, data?: any, options?: ApiRequestOptions) =>
        apiRequest<T>(endpoint, {
            ...options,
            method: 'POST',
            body: data ? JSON.stringify(data) : undefined,
        }),

    put: <T>(endpoint: string, data?: any, options?: ApiRequestOptions) =>
        apiRequest<T>(endpoint, {
            ...options,
            method: 'PUT',
            body: data ? JSON.stringify(data) : undefined,
        }),

    patch: <T>(endpoint: string, data?: any, options?: ApiRequestOptions) =>
        apiRequest<T>(endpoint, {
            ...options,
            method: 'PATCH',
            body: data ? JSON.stringify(data) : undefined,
        }),

    delete: <T>(endpoint: string, options?: ApiRequestOptions) =>
        apiRequest<T>(endpoint, { ...options, method: 'DELETE' }),
};
