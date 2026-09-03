import { api } from '@/lib/api';

export interface Permission {
    id: string;
    name: string;
    code: string;
    type: 'menu' | 'button' | 'data';
    parent_id: string | null;
    path?: string;
    icon?: string;
    sort_order: number;
    description?: string;
    children?: Permission[];
}

export interface Role {
    id: string;
    name: string;
    description?: string;
    permissions: string[];
    created_at: string;
    updated_at: string;
    user_count?: number;
}

export interface User {
    id: string;
    username: string;
    email: string;
    full_name?: string;
    avatar?: string;
    roles: string[];
    status?: 'active' | 'inactive';
    is_active: boolean;   // 改用布尔值
    created_at: string;
}

export const permissionApi = {
    // ---- 权限 ----
    getPermissionsTree: () =>
        api.get<Permission[]>('/api/v1/permissions/tree'),

    getPermissionsList: () =>
        api.get<Permission[]>('/api/v1/permissions'),

    // ---- 角色 ----
    getRoles: () =>
        api.get<Role[]>('/api/v1/roles'),

    getRole: (id: string) =>
        api.get<Role>(`/api/v1/roles/${id}`),

    createRole: (data: { name: string; description?: string; is_default?: boolean }) =>
        api.post<Role>('/api/v1/roles', data),

    updateRole: (id: string, data: Partial<Role>) =>
        api.put<Role>(`/api/v1/roles/${id}`, data),

    deleteRole: (id: string) =>
        api.delete(`/api/v1/roles/${id}`),

    getRolePermissions: (roleId: string) =>
        api.get<{ permission_ids: string[] }>(`/api/v1/roles/${roleId}/permissions`),

    assignPermissions: (roleId: string, permissionIds: string[]) =>
        api.post(`/api/v1/roles/${roleId}/permissions`, { permission_ids: permissionIds }),

    // ---- 用户 ----
    getUsers: (params?: { skip?: number; limit?: number }) => {
        const query = new URLSearchParams();
        if (params?.skip !== undefined) query.append('skip', String(params.skip));
        if (params?.limit !== undefined) query.append('limit', String(params.limit));
        return api.get<User[]>(`/api/v1/users?${query.toString()}`);
    },

    getUser: (id: string) =>
        api.get<User>(`/api/v1/users/${id}`),

    createUser: (data: { username: string; email: string; password: string; full_name?: string }) =>
        api.post<User>('/api/v1/users', data),

    updateUser: (id: string, data: Partial<User>) =>
        api.put<User>(`/api/v1/users/${id}`, data),

    deleteUser: (id: string) =>
        api.delete(`/api/v1/users/${id}`),

    getUserRoles: (userId: string) =>
        api.get<{ role_ids: string[] }>(`/api/v1/users/${userId}/roles`),

    assignUserRoles: (userId: string, roleIds: string[]) =>
        api.post(`/api/v1/users/${userId}/roles`, roleIds),
};