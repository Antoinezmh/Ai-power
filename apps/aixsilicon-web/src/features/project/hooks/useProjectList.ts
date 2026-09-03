import { useQuery } from '@tanstack/react-query';
import { fetchProjects, fetchStats } from '../api/projectApi';

export function useProjectList() {
    return useQuery({
        queryKey: ['projects'],
        queryFn: fetchProjects,
    });
}

export function useProjectStats() {
    return useQuery({
        queryKey: ['stats'],
        queryFn: fetchStats,
        staleTime: 5 * 60 * 1000,
    });
}