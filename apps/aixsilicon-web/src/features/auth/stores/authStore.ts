import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
    id: string;
    username: string;
    email: string;
    full_name?: string;
    avatar?: string;
    roles: string[];
    permissions: string[];
    is_superuser: boolean;
}

interface AuthState {
    user: User | null;
    accessToken: string | null;
    refreshToken: string | null;
    chatSessionId: string | null;
    isAuthenticated: boolean;
    setAuth: (user: User, accessToken: string, refreshToken: string) => void;
    setTokens: (accessToken: string, refreshToken: string) => void;
    clearAuth: () => void;
    updateUser: (user: Partial<User>) => void;
    ensureChatSessionId: () => string;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            accessToken: null,
            refreshToken: null,
            chatSessionId: null,
            isAuthenticated: false,

            setAuth: (user, accessToken, refreshToken) =>
                set({
                    user,
                    accessToken,
                    refreshToken,
                    isAuthenticated: true,
                    chatSessionId: crypto.randomUUID(),
                }),

            setTokens: (accessToken, refreshToken) =>
                set({ accessToken, refreshToken, isAuthenticated: true }),

            clearAuth: () =>
                set({
                    user: null,
                    accessToken: null,
                    refreshToken: null,
                    isAuthenticated: false,
                    chatSessionId: null,
                }),

            updateUser: (userData) =>
                set((state) => ({
                    user: state.user ? { ...state.user, ...userData } : null,
                })),

            ensureChatSessionId: () => {
                const existing = get().chatSessionId;
                if (existing) return existing;
                const chatSessionId = crypto.randomUUID();
                set({ chatSessionId });
                return chatSessionId;
            },
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({
                user: state.user,
                accessToken: state.accessToken,
                refreshToken: state.refreshToken,
                isAuthenticated: state.isAuthenticated,
                chatSessionId: state.chatSessionId,
            }),
        }
    )
);
