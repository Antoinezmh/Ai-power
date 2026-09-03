import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { permissionApi, Role, User, Permission } from '../api/permissionApi';

export const PERMISSIONS_QUERY_KEY = 'permissions';
export const ROLES_QUERY_KEY = 'roles';
export const USERS_QUERY_KEY = 'users';

// ---- 权限 ----
export function usePermissionsTree() {
    return useQuery({
        queryKey: [PERMISSIONS_QUERY_KEY, 'tree'],
        queryFn: permissionApi.getPermissionsTree,
        staleTime: 10 * 60 * 1000,
    });
}

export function usePermissionsList() {
    return useQuery({
        queryKey: [PERMISSIONS_QUERY_KEY, 'list'],
        queryFn: permissionApi.getPermissionsList,
        staleTime: 10 * 60 * 1000,
    });
}

// ---- 角色 ----
export function useRoles() {
    return useQuery({
        queryKey: [ROLES_QUERY_KEY],
        queryFn: permissionApi.getRoles,
        staleTime: 60 * 1000,
    });
}

export function useRole(id: string) {
    return useQuery({
        queryKey: [ROLES_QUERY_KEY, id],
        queryFn: () => permissionApi.getRole(id),
        enabled: !!id,
        staleTime: 60 * 1000,
    });
}

export function useCreateRole() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: permissionApi.createRole,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [ROLES_QUERY_KEY] });
        },
    });
}

export function useUpdateRole() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<Role> }) =>
            permissionApi.updateRole(id, data),
        onSuccess: (_, { id }) => {
            queryClient.invalidateQueries({ queryKey: [ROLES_QUERY_KEY] });
            queryClient.invalidateQueries({ queryKey: [ROLES_QUERY_KEY, id] });
        },
    });
}

export function useDeleteRole() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: permissionApi.deleteRole,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [ROLES_QUERY_KEY] });
        },
    });
}

export function useAssignPermissions() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ roleId, permissionIds }: { roleId: string; permissionIds: string[] }) =>
            permissionApi.assignPermissions(roleId, permissionIds),
        onSuccess: (_, { roleId }) => {
            queryClient.invalidateQueries({ queryKey: [ROLES_QUERY_KEY] });
            queryClient.invalidateQueries({ queryKey: [ROLES_QUERY_KEY, roleId] });
        },
    });
}

// ---- 用户 ----
export function useUsers(params?: { skip?: number; limit?: number }) {
    return useQuery({
        queryKey: [USERS_QUERY_KEY, params],
        queryFn: () => permissionApi.getUsers(params),
        staleTime: 60 * 1000,
    });
}

export function useUser(id: string) {
    return useQuery({
        queryKey: [USERS_QUERY_KEY, id],
        queryFn: () => permissionApi.getUser(id),
        enabled: !!id,
        staleTime: 60 * 1000,
    });
}

export function useCreateUser() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: permissionApi.createUser,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [USERS_QUERY_KEY] });
        },
    });
}

export function useUpdateUser() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<User> }) =>
            permissionApi.updateUser(id, data),
        onSuccess: () => {
            // 使所有用户查询失效，并立即重新获取
            queryClient.invalidateQueries({ queryKey: [USERS_QUERY_KEY] });
            queryClient.refetchQueries({ queryKey: [USERS_QUERY_KEY] });
        },
    });
}

export function useDeleteUser() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: permissionApi.deleteUser,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [USERS_QUERY_KEY] });
        },
    });
}

export function useAssignUserRoles() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ userId, roleIds }: { userId: string; roleIds: string[] }) =>
            permissionApi.assignUserRoles(userId, roleIds),
        onSuccess: (_, { userId }) => {
            queryClient.invalidateQueries({ queryKey: [USERS_QUERY_KEY] });
            queryClient.invalidateQueries({ queryKey: [USERS_QUERY_KEY, userId] });
        },
    });
}
