import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../api/dashboardApi';

export const DASHBOARD_QUERY_KEY = 'dashboardStats';

export function useDashboardStats() {
    return useQuery({
        queryKey: [DASHBOARD_QUERY_KEY],
        queryFn: dashboardApi.getStats,
        staleTime: 30 * 1000,         // 30秒内数据新鲜
        refetchInterval: 60 * 1000,   // 每60秒自动刷新
        refetchOnWindowFocus: true,
    });
}