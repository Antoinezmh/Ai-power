import { api } from '@/lib/api';

export interface ProjectStats {
    total: number;
    active: number;
    todayCalls: number;
    health: number;
}

export interface ProjectSummary {
    id: string;
    name: string;
    status: string;
    owner: string;
    updatedAt: string;
}

export async function fetchProjects(): Promise<ProjectSummary[]> {
    return api.get<ProjectSummary[]>('/api/projects');
}

export async function fetchStats(): Promise<ProjectStats> {
    return api.get<ProjectStats>('/api/stats');
}