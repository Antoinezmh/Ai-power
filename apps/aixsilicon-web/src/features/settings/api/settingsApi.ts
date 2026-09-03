import { api } from '@/lib/api';

export interface Profile {
    nickname: string;
    email: string;
    bio: string;
    avatar?: string;
}

export interface ApiKey {
    id: string;
    name: string;
    key: string;
    created_at: string;
    last_used?: string;
}

export const settingsApi = {
    getProfile: () =>
        api.get<Profile>('/api/v1/settings/profile'),

    updateProfile: (data: Partial<Profile>) =>
        api.put('/api/v1/settings/profile', data),

    changePassword: (oldPassword: string, newPassword: string) =>
        api.post('/api/v1/settings/change-password', { old_password: oldPassword, new_password: newPassword }),

    getApiKeys: () =>
        api.get<ApiKey[]>('/api/v1/settings/api-keys'),

    createApiKey: (name: string) =>
        api.post<ApiKey>(`/api/v1/settings/api-keys?name=${encodeURIComponent(name)}`),

    deleteApiKey: (keyId: string) =>
        api.delete(`/api/v1/settings/api-keys/${keyId}`),
};