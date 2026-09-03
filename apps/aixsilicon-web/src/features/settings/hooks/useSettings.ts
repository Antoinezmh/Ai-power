import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi, Profile, ApiKey } from '../api/settingsApi';

export const SETTINGS_QUERY_KEY = 'settings';

export function useProfile() {
    return useQuery({
        queryKey: [SETTINGS_QUERY_KEY, 'profile'],
        queryFn: settingsApi.getProfile,
        staleTime: 5 * 60 * 1000,
    });
}

export function useUpdateProfile() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: settingsApi.updateProfile,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [SETTINGS_QUERY_KEY, 'profile'] });
        },
    });
}

export function useChangePassword() {
    return useMutation({
        mutationFn: ({ oldPassword, newPassword }: { oldPassword: string; newPassword: string }) =>
            settingsApi.changePassword(oldPassword, newPassword),
    });
}

export function useApiKeys() {
    return useQuery({
        queryKey: [SETTINGS_QUERY_KEY, 'apiKeys'],
        queryFn: settingsApi.getApiKeys,
        staleTime: 60 * 1000,
    });
}

export function useCreateApiKey() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: settingsApi.createApiKey,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [SETTINGS_QUERY_KEY, 'apiKeys'] });
        },
    });
}

export function useDeleteApiKey() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: settingsApi.deleteApiKey,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [SETTINGS_QUERY_KEY, 'apiKeys'] });
        },
    });
}