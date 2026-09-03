import { useMemo } from 'react';
import {
    Card,
    CardContent,
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
    Badge,
} from '@aixsilicon/ui';
import { FolderTree } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { toolApi } from '@/features/tools/api/toolsApi';
import { TOOLS_QUERY_KEY } from '@/features/tools/hooks/useTools';

// 八大一级分组 + 三个功能型（与后端 file_center.py GROUPS / FUNC_TYPES 保持一致）
const GROUP_OPTIONS = ['器件组', 'GaN功率组', '系统与表征组', '外延组', 'sic开发组', '射频组', '工艺工程组', 'si基研发组'];
const FUNC_TYPE_OPTIONS = ['数据处理', '报告产出', '原始数据'];

interface ToolSpace {
    namespace: string;
    count: number;
}

export default function Categories() {
    // 拉取全部工具以统计八组 / 三型 / 工具空间的分布
    const { data: tools = [], isLoading } = useQuery({
        queryKey: [TOOLS_QUERY_KEY, 'all'],
        queryFn: () => toolApi.list({ limit: 1000 }),
        staleTime: 60 * 1000,
    });

    // 工具空间（namespace）分布
    const toolSpaces = useMemo<ToolSpace[]>(() => {
        const map = new Map<string, number>();
        tools.forEach((t) => {
            const ns = (t.namespace || t.group_name || '未分配').trim();
            map.set(ns, (map.get(ns) || 0) + 1);
        });
        return Array.from(map.entries())
            .map(([namespace, count]) => ({ namespace, count }))
            .sort((a, b) => b.count - a.count);
    }, [tools]);

    // 每组内各功能型计数
    const groupFuncStats = useMemo(() => {
        return GROUP_OPTIONS.map((g) => {
            const gTools = tools.filter((t) => (t.group_name || '') === g);
            return {
                group: g,
                total: gTools.length,
                byFunc: FUNC_TYPE_OPTIONS.map((f) => ({
                    funcType: f,
                    count: gTools.filter((t) => (t.func_type || '') === f).length,
                })),
            };
        });
    }, [tools]);

    if (isLoading) return <div className="p-8 text-center text-text-secondary">加载中...</div>;

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-text-primary">文件中心分类</h1>
                <p className="text-sm text-text-secondary">
                    与文件中心对齐：八大一级分组 × 三个功能型 × 工具空间。工具空间在「工具市场 → 新建/编辑工具」中填写。
                </p>
            </div>

            {/* 八组 × 三型 统计 */}
            <Card>
                <CardContent className="p-6">
                    <div className="mb-4 flex items-center gap-2">
                        <FolderTree className="h-5 w-5 text-text-muted" />
                        <h2 className="font-semibold text-text-primary">一级分组 × 功能型 统计（固定八组）</h2>
                    </div>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>一级分组</TableHead>
                                <TableHead>数据处理</TableHead>
                                <TableHead>报告产出</TableHead>
                                <TableHead>原始数据</TableHead>
                                <TableHead>合计</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {groupFuncStats.map((row) => (
                                <TableRow key={row.group}>
                                    <TableCell>
                                        <span className="font-medium">{row.group}</span>
                                    </TableCell>
                                    {row.byFunc.map((f) => (
                                        <TableCell key={f.funcType}>
                                            <Badge variant="info">{f.count}</Badge>
                                        </TableCell>
                                    ))}
                                    <TableCell>
                                        <Badge>{row.total}</Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* 工具空间（namespace）概览（只读） */}
            <Card>
                <CardContent className="p-6">
                    <h2 className="mb-1 font-semibold text-text-primary">工具空间（namespace）概览</h2>
                    <p className="mb-4 text-xs text-text-muted">
                        每个工具在文件中心的专属存储/权限目录名，存放路径为「八组 / 三型 / 工具空间 / 文件」。
                        此处仅展示当前各工具空间的分布情况；新增/修改请在「工具市场 → 新建/编辑工具」中操作。
                    </p>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>工具空间</TableHead>
                                <TableHead>工具数</TableHead>
                                <TableHead>状态</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {toolSpaces.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center text-text-muted py-8">
                                        暂无工具空间，请在「工具市场 → 新建工具」中为工具设置分组/功能型/工具空间
                                    </TableCell>
                                </TableRow>
                            ) : (
                                toolSpaces.map((sp) => (
                                    <TableRow key={sp.namespace}>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <FolderTree className="h-4 w-4 text-text-muted" />
                                                {sp.namespace}
                                            </div>
                                        </TableCell>
                                        <TableCell>{sp.count}</TableCell>
                                        <TableCell>
                                            <Badge variant={sp.count > 0 ? 'success' : 'info'}>
                                                {sp.count > 0 ? '使用中' : '空闲'}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
