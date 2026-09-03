import { api } from '@/lib/api';
import { Tool } from '@/features/tools/api/toolsApi';

export const favoriteApi = {
    add: (toolId: string) => api.post(`/api/v1/favorites/${toolId}`),
    remove: (toolId: string) => api.delete(`/api/v1/favorites/${toolId}`),
    list: () => api.get<Tool[]>('/api/v1/favorites'),
};