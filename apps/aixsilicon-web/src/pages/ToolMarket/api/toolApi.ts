import { api } from '@/lib/api';

export interface Tool {
    id: string;
    name: string;
    description: string;
    category: string;
    tags: string[];
    owner: string;
    usage_count: number;
    icon: string;
    rating: number;
    is_active: boolean;
    status: 'active' | 'inactive' | 'deprecated';
    created_at: string;
    updated_at: string;
}

export interface ToolListParams {
    skip?: number;
    limit?: number;
    category?: string;
    search?: string;
}

export async function getTools(params: ToolListParams): Promise<Tool[]> {
    const query = new URLSearchParams();
    if (params.skip !== undefined) query.append('skip', String(params.skip));
    if (params.limit !== undefined) query.append('limit', String(params.limit));
    if (params.category) query.append('category', params.category);
    if (params.search) query.append('search', params.search);
    const url = `/api/v1/tools?${query.toString()}`;
    return api.get<Tool[]>(url);
}

export async function getTool(id: string): Promise<Tool> {
    return api.get<Tool>(`/api/v1/tools/${id}`);
}

export async function useTool(id: string): Promise<void> {
    await api.post(`/api/v1/tools/${id}/use`);
}