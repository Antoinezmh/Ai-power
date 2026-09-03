import { MockMethod } from 'vite-plugin-mock';
import { ProjectSummary, ProjectStats } from '@aixsilicon/shared-types';

const projects: ProjectSummary[] = [
    { id: '1', name: 'AI 代码生成', status: 'active', owner: '张三', updatedAt: '2025-03-01' },
    { id: '2', name: '智能文档处理', status: 'inactive', owner: '李四', updatedAt: '2025-02-20' },
];

const stats: ProjectStats = {
    total: 12,
    active: 8,
    todayCalls: 145,
    health: 98,
};

export default [
    {
        url: '/api/projects',
        method: 'get',
        response: () => projects,
    },
    {
        url: '/api/stats',
        method: 'get',
        response: () => stats,
    },
] as MockMethod[];