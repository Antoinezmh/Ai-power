import { api } from '@/lib/api';

export interface Tool {
    id: string;
    name: string;
    description: string;
    category_id: string;
    tags: string[];
    owner: string;
    usage_count: number;
    icon: string;
    rating: number;
    is_active: boolean;
    status: 'active' | 'inactive' | 'deprecated';
    type: 'internal' | 'static' | 'external' | 'executable' | 'streamlit';  // 扩展联合类型
    source: string;
    entry?: string;
    // 新增可执行程序字段
    executable_path?: string;
    executable_args?: any;
    executable_working_dir?: string;
    streamlit_port?: number;
    // 文件中心分类字段
    group_name?: string;
    func_type?: string;
    namespace?: string;
    created_at: string;
    updated_at: string;
}
export interface ToolListParams {
    skip?: number;
    limit?: number;
    category_id?: string;
    search?: string;
    group_name?: string;
    func_type?: string;
    namespace?: string;
}

export interface CategoryItem {
    id: string;
    name: string;
    count: number;
    items: CategoryItem[]; // 子分类（可选）
}

export const toolApi = {
    // 工具列表
    list: (params: ToolListParams) => {
        const query = new URLSearchParams();
        if (params.skip !== undefined) query.append('skip', String(params.skip));
        if (params.limit !== undefined) query.append('limit', String(params.limit));
        if (params.category_id) query.append('category_id', params.category_id);
        if (params.search) query.append('search', params.search);
        if (params.group_name) query.append('group_name', params.group_name);
        if (params.func_type) query.append('func_type', params.func_type);
        if (params.namespace) query.append('namespace', params.namespace);
        return api.get<Tool[]>(`/api/v1/tools?${query.toString()}`);
    },

    // 获取分类及数量（后端新增接口）
    getCategories: () =>
        api.get<CategoryItem[]>('/api/v1/tools/categories'),

    // 单个工具
    get: (id: string) =>
        api.get<Tool>(`/api/v1/tools/${id}`),

    // 创建工具
    create: (data: Omit<Tool, 'id' | 'usage_count' | 'is_active' | 'created_at' | 'updated_at'>) =>
        api.post<Tool>('/api/v1/tools', data),

    // 更新工具
    update: (id: string, data: Partial<Tool>) =>
        api.put<Tool>(`/api/v1/tools/${id}`, data),

    // 删除工具
    delete: (id: string) =>
        api.delete(`/api/v1/tools/${id}`),

    // 使用工具（计数+1）
    use: (id: string) =>
        api.post(`/api/v1/tools/${id}/use`),
};