export interface UserProfile {
    nickname: string;
    email: string;
    bio: string;
    avatar?: string;
}

export interface SecuritySettings {
    oldPassword?: string;
    newPassword?: string;
    twoFactorEnabled: boolean;
}

export interface NotificationSettings {
    emailNotifications: boolean;
    systemNotifications: boolean;
    messageReminders: boolean;
}

export interface AppearanceSettings {
    theme: 'light' | 'dark' | 'system';
    sidebarCollapsed: boolean;
    reduceAnimations: boolean;
}

export interface ApiKey {
    id: string;
    name: string;
    key: string;
    createdAt: string;
    lastUsed?: string;
}