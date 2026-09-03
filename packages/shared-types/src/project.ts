export interface ProjectSummary {
    id: string;
    name: string;
    status: 'active' | 'inactive' | 'pending';
    owner: string;
    updatedAt: string;
}

export interface ProjectStats {
    total: number;
    active: number;
    todayCalls: number;
    health: number; // 0-100
}