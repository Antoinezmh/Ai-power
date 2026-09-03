export interface Permission {
    id: string;
    name: string;
    code: string;               // 权限标识符，如 'menu:user:view'
    type: 'menu' | 'button' | 'data';  // 权限类型
    parentId: string | null;
    path?: string;              // 菜单路径
    icon?: string;
    sortOrder: number;
    description?: string;
    children?: Permission[];
}

export interface Role {
    id: string;
    name: string;
    description?: string;
    permissions: string[];      // 权限ID列表
    createdAt: string;
    updatedAt: string;
    userCount?: number;
}

export interface User {
    id: string;
    username: string;
    email: string;
    avatar?: string;
    roles: string[];            // 角色ID列表
    status: 'active' | 'inactive';
    createdAt: string;
}

export interface PermissionTreeItem {
    id: string;
    name: string;
    code: string;
    type: Permission['type'];
    children?: PermissionTreeItem[];
}