import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Permission, Role, User } from '../types';
import { useAuthStore } from '@/features/auth/stores/authStore';

// 判断是否使用模拟数据（可通过环境变量控制）
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true' || false;

// ========== 模拟数据 ==========
const mockPermissions: Permission[] = [
    {
        id: 'p1',
        name: '仪表盘',
        code: 'menu:dashboard',
        type: 'menu',
        parentId: null,
        path: '/dashboard',
        icon: 'LayoutDashboard',
        sortOrder: 1,
        children: [
            {
                id: 'p1-1',
                name: '查看仪表盘',
                code: 'button:dashboard:view',
                type: 'button',
                parentId: 'p1',
                sortOrder: 1,
            },
        ],
    },
    {
        id: 'p2',
        name: '工具市场',
        code: 'menu:tools',
        type: 'menu',
        parentId: null,
        path: '/tools',
        icon: 'Store',
        sortOrder: 2,
        children: [
            {
                id: 'p2-1',
                name: '查看工具',
                code: 'button:tools:view',
                type: 'button',
                parentId: 'p2',
                sortOrder: 1,
            },
            {
                id: 'p2-2',
                name: '使用工具',
                code: 'button:tools:use',
                type: 'button',
                parentId: 'p2',
                sortOrder: 2,
            },
            {
                id: 'p2-3',
                name: '管理工具',
                code: 'button:tools:manage',
                type: 'button',
                parentId: 'p2',
                sortOrder: 3,
            },
        ],
    },
    {
        id: 'p3',
        name: 'AI对话',
        code: 'menu:chat',
        type: 'menu',
        parentId: null,
        path: '/chat',
        icon: 'MessageSquare',
        sortOrder: 3,
    },
    {
        id: 'p4',
        name: '权限管理',
        code: 'menu:permissions',
        type: 'menu',
        parentId: null,
        path: '/permissions',
        icon: 'Shield',
        sortOrder: 4,
        children: [
            {
                id: 'p4-1',
                name: '查看权限',
                code: 'button:permissions:view',
                type: 'button',
                parentId: 'p4',
                sortOrder: 1,
            },
            {
                id: 'p4-2',
                name: '管理角色',
                code: 'button:permissions:manageRoles',
                type: 'button',
                parentId: 'p4',
                sortOrder: 2,
            },
            {
                id: 'p4-3',
                name: '管理用户',
                code: 'button:permissions:manageUsers',
                type: 'button',
                parentId: 'p4',
                sortOrder: 3,
            },
        ],
    },
    {
        id: 'p5',
        name: '个人设置',
        code: 'menu:settings',
        type: 'menu',
        parentId: null,
        path: '/settings',
        icon: 'Settings',
        sortOrder: 5,
        children: [
            {
                id: 'p5-1',
                name: '查看设置',
                code: 'button:settings:view',
                type: 'button',
                parentId: 'p5',
                sortOrder: 1,
            },
            {
                id: 'p5-2',
                name: '修改设置',
                code: 'button:settings:edit',
                type: 'button',
                parentId: 'p5',
                sortOrder: 2,
            },
        ],
    },
];

const mockRoles: Role[] = [
    {
        id: 'role1',
        name: '超级管理员',
        description: '拥有所有权限',
        permissions: mockPermissions.flatMap(p => [p.id, ...(p.children?.map(c => c.id) || [])]),
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
        userCount: 2,
    },
    {
        id: 'role2',
        name: '普通用户',
        description: '基础操作权限',
        permissions: ['p1', 'p1-1', 'p2', 'p2-1', 'p2-2', 'p3', 'p5', 'p5-1'],
        createdAt: '2025-01-02',
        updatedAt: '2025-01-02',
        userCount: 5,
    },
    {
        id: 'role3',
        name: '工具管理员',
        description: '管理工具市场',
        permissions: ['p2', 'p2-1', 'p2-2', 'p2-3', 'p4', 'p4-1'],
        createdAt: '2025-01-03',
        updatedAt: '2025-01-03',
        userCount: 3,
    },
];

const mockUsers: User[] = [
    {
        id: 'user1',
        username: 'admin',
        email: 'admin@example.com',
        roles: ['role1'],
        status: 'active',
        createdAt: '2025-01-01',
    },
    {
        id: 'user2',
        username: 'zhangsan',
        email: 'zhangsan@example.com',
        roles: ['role2'],
        status: 'active',
        createdAt: '2025-01-02',
    },
    {
        id: 'user3',
        username: 'lisi',
        email: 'lisi@example.com',
        roles: ['role2', 'role3'],
        status: 'inactive',
        createdAt: '2025-01-03',
    },
];

// ========== 真实 API 调用函数 ==========
async function fetchRolesFromAPI(): Promise<Role[]> {
    return api.get<Role[]>('/api/v1/roles');
}

async function fetchPermissionsTreeFromAPI(): Promise<Permission[]> {
    return api.get<Permission[]>('/api/v1/permissions/tree');
}

async function fetchUsersFromAPI(): Promise<User[]> {
    return api.get<User[]>('/api/v1/users');
}

// ========== Hooks ==========
export function useRoles() {
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const { user } = useAuthStore();

    useEffect(() => {
        // 用户身份变化（登录/登出）时重新拉取角色列表
        setLoading(true);
        setRoles([]);
        setError(null);

        const load = async () => {
            try {
                if (USE_MOCK) {
                    setRoles(mockRoles);
                } else {
                    const data = await fetchRolesFromAPI();
                    setRoles(data);
                }
            } catch (err) {
                setError(err as Error);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [user?.id]);

    // 本地 CRUD（仅模拟）
    const addRole = (role: Omit<Role, 'id' | 'createdAt' | 'updatedAt'>) => {
        const newRole: Role = {
            ...role,
            id: `role${Date.now()}`,
            createdAt: new Date().toISOString().split('T')[0],
            updatedAt: new Date().toISOString().split('T')[0],
            userCount: 0,
            permissions: [],
        };
        setRoles(prev => [...prev, newRole]);
        return newRole;
    };

    const updateRole = (id: string, data: Partial<Role>) => {
        setRoles(prev => prev.map(r => r.id === id ? { ...r, ...data, updatedAt: new Date().toISOString().split('T')[0] } : r));
    };

    const deleteRole = (id: string) => {
        setRoles(prev => prev.filter(r => r.id !== id));
    };

    const assignPermissions = (roleId: string, permissionIds: string[]) => {
        setRoles(prev => prev.map(r => r.id === roleId ? { ...r, permissions: permissionIds } : r));
    };

    return { roles, loading, error, addRole, updateRole, deleteRole, assignPermissions };
}

export function useUsers() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const load = async () => {
            try {
                if (USE_MOCK) {
                    setUsers(mockUsers);
                } else {
                    const data = await fetchUsersFromAPI();
                    setUsers(data);
                }
            } catch (err) {
                setError(err as Error);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const assignRoles = (userId: string, roleIds: string[]) => {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, roles: roleIds } : u));
    };

    return { users, loading, error, assignRoles };
}

export function usePermissionsTree() {
    const [tree, setTree] = useState<Permission[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const { user } = useAuthStore();

    useEffect(() => {
        // 用户身份变化（登录/登出）时重新拉取权限树
        setLoading(true);
        setTree([]);
        setError(null);

        const load = async () => {
            try {
                if (USE_MOCK) {
                    setTree(mockPermissions);
                } else {
                    const data = await fetchPermissionsTreeFromAPI();
                    setTree(data);
                }
            } catch (err) {
                setError(err as Error);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [user?.id]);

    return tree;
}

export function useFlatPermissions() {
    const tree = usePermissionsTree();
    const flat: Permission[] = [];
    const flatten = (nodes: Permission[]) => {
        nodes.forEach(node => {
            flat.push(node);
            if (node.children) flatten(node.children);
        });
    };
    flatten(tree);
    return flat;
}