import { create } from 'zustand';

export interface User {
    id: string;
    name: string;
    email: string;
    roles: string[];   // 角色 ID 列表
    avatar?: string;
}

interface UserState {
    user: User | null;
    setUser: (user: User) => void;
    clearUser: () => void;
}

// 默认用户为超级管理员（角色 ID: role1）
const defaultUser: User = {
    id: 'user1',
    name: '管理员',
    email: 'admin@example.com',
    roles: ['role1'],  // 超级管理员角色
};

export const useUserStore = create<UserState>((set) => ({
    user: defaultUser,
    setUser: (user) => set({ user }),
    clearUser: () => set({ user: null }),
}));