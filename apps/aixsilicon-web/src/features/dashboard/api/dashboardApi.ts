import { api } from '@/lib/api';

export interface DashboardStats {
    total_tools: number;
    active_tools: number;
    today_calls: number;
    total_calls: number;          // 新增：累计调用
    growth_rate: number;          // 新增：今日增长率
    usage_trend: { date: string; count: number }[];
    project_distribution: {
        name: string;
        value: number;
        percent: number;          // 新增：百分比
    }[];
    recent_tools: {
        id: string;
        name: string;
        description: string;
        owner: string;
        usage_count: number;
        icon: string;
        time: string;
    }[];
}

export const dashboardApi = {
    getStats: () =>
        api.get<DashboardStats>('/api/v1/stats/dashboard'),
};