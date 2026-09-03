import { api } from '@/lib/api';

export interface Category {
    id: string;
    name: string;
    parent_id: string | null;
    sort_order: number;
    children?: Category[];
}

export const categoryApi = {
    getTree: () => api.get<Category[]>('/api/v1/categories/tree'),
    list: () => api.get<Category[]>('/api/v1/categories'),
    create: (data: { name: string; parent_id?: string | null }) =>
        api.post<Category>('/api/v1/categories', data),
    update: (id: string, data: Partial<Category>) =>
        api.put<Category>(`/api/v1/categories/${id}`, data),
    delete: (id: string) => api.delete(`/api/v1/categories/${id}`),
};