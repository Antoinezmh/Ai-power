// src/context/PermissionContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuthStore } from '@/features/auth/stores/authStore';

interface PermissionContextType {
    hasPermission: (code: string) => boolean;
    permissionCodes: string[];
    loading: boolean;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

export const PermissionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuthStore();
    const [permissionCodes, setPermissionCodes] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 如果用户未登录或数据未加载完成，保持 loading 状态
        if (!user) {
            setPermissionCodes([]);
            setLoading(false);
            return;
        }

        // /auth/me is the single server-authoritative bootstrap response.
        // Do not derive access from frontend role IDs: an SSO role is not a UI contract.
        setPermissionCodes(user.is_superuser ? ['*'] : (user.permissions || []));
        setLoading(false);
    }, [user]);

    const hasPermission = (code: string) => {
        return user?.is_superuser === true || permissionCodes.includes('*') || permissionCodes.includes(code);
    };

    // 即使加载中或出错，始终提供上下文，防止组件崩溃
    return (
        <PermissionContext.Provider value={{ hasPermission, permissionCodes, loading }}>
            {children}
        </PermissionContext.Provider>
    );
};

export const usePermission = () => {
    const context = useContext(PermissionContext);
    if (!context) {
        throw new Error('usePermission must be used within PermissionProvider');
    }
    return context;
};
