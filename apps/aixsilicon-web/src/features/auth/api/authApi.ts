import { api } from '@/lib/api';

export interface LoginRequest {
    username: string;
    password: string;
}

export interface LoginResponse {
    access_token: string;
    refresh_token: string;
    token_type: string;
}

export interface UserInfo {
    id: string;
    username: string;
    email: string;
    full_name?: string;
    avatar?: string;
    roles: string[];
    permissions: string[];
    is_superuser: boolean;
}

export interface SsoConfig {
    enabled: boolean;
    authorize_url: string;
    client_id: string;
    redirect_uri: string;
    scope: string;
    state?: string;
}

export interface SsoCallbackRequest {
    code: string;
    state?: string;
}

export const authApi = {
    login: (data: LoginRequest) =>
        api.post<LoginResponse>('/api/v1/auth/login', data),

    refresh: (refreshToken: string) =>
        api.post<LoginResponse>('/api/v1/auth/refresh', { refresh_token: refreshToken }),

    getMe: () =>
        api.get<UserInfo>('/api/v1/auth/me'),

    logout: () =>
        api.post('/api/v1/auth/logout'),

    // ---- 统一登录（SSO）----
    getSsoConfig: () =>
        api.get<SsoConfig>('/api/v1/auth/sso/config'),

    ssoCallback: (data: SsoCallbackRequest) =>
        api.post<LoginResponse>('/api/v1/auth/sso/callback', data),
};
