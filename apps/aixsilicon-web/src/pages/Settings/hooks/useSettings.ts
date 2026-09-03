import { useState } from 'react';
import { UserProfile, SecuritySettings, NotificationSettings, AppearanceSettings, ApiKey } from '../types';

const initialProfile: UserProfile = {
    nickname: '管理员',
    email: 'admin@example.com',
    bio: 'AI平台管理员',
};

const initialSecurity: SecuritySettings = {
    twoFactorEnabled: false,
};

const initialNotification: NotificationSettings = {
    emailNotifications: true,
    systemNotifications: true,
    messageReminders: false,
};

const initialAppearance: AppearanceSettings = {
    theme: 'system',
    sidebarCollapsed: false,
    reduceAnimations: false,
};

const mockApiKeys: ApiKey[] = [
    { id: '1', name: '开发密钥', key: 'ak-xxxxxxxxxxxxx', createdAt: '2025-01-01', lastUsed: '2025-03-01' },
    { id: '2', name: '测试密钥', key: 'ak-yyyyyyyyyyyyy', createdAt: '2025-02-01' },
];

export function useSettings() {
    const [profile, setProfile] = useState<UserProfile>(initialProfile);
    const [security, setSecurity] = useState<SecuritySettings>(initialSecurity);
    const [notification, setNotification] = useState<NotificationSettings>(initialNotification);
    const [appearance, setAppearance] = useState<AppearanceSettings>(initialAppearance);
    const [apiKeys, setApiKeys] = useState<ApiKey[]>(mockApiKeys);

    const updateProfile = (data: Partial<UserProfile>) => {
        setProfile(prev => ({ ...prev, ...data }));
        return Promise.resolve();
    };

    const updateSecurity = (data: Partial<SecuritySettings>) => {
        setSecurity(prev => ({ ...prev, ...data }));
        return Promise.resolve();
    };

    const updateNotification = (data: Partial<NotificationSettings>) => {
        setNotification(prev => ({ ...prev, ...data }));
        return Promise.resolve();
    };

    const updateAppearance = (data: Partial<AppearanceSettings>) => {
        setAppearance(prev => ({ ...prev, ...data }));
        return Promise.resolve();
    };

    const createApiKey = (name: string) => {
        const newKey: ApiKey = {
            id: `key${Date.now()}`,
            name,
            key: `ak-${Math.random().toString(36).substring(2, 15)}`,
            createdAt: new Date().toISOString().split('T')[0],
        };
        setApiKeys(prev => [...prev, newKey]);
        return Promise.resolve(newKey);
    };

    const deleteApiKey = (id: string) => {
        setApiKeys(prev => prev.filter(k => k.id !== id));
        return Promise.resolve();
    };

    return {
        profile,
        security,
        notification,
        appearance,
        apiKeys,
        updateProfile,
        updateSecurity,
        updateNotification,
        updateAppearance,
        createApiKey,
        deleteApiKey,
    };
}