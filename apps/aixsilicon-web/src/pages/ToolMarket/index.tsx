import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Input, Button, Badge } from '@aixsilicon/ui';
import {
    Search,
    ChevronDown,
    ChevronRight,
    X,
    Code2,
    BarChart3,
    Workflow,
    Settings,
    Heart,
} from 'lucide-react';
import { ToolCard } from './components/ToolCard';
import { ToolDetailDrawer } from './components/ToolDetailDrawer';
import { ToolManageDialog } from './components/ToolManageDialog';
import { useToolsInfinite, useUseTool, useDeleteTool } from '@/features/tools/hooks/useTools';
import { PermissionGuard } from '@/components/PermissionGuard';
import { useFavorites, useToggleFavorite } from '@/features/favorites/hooks/useFavorites';
import { message } from '@aixsilicon/ui';
import { Tool } from '@/features/tools/api/toolsApi';
import { api } from '@/lib/api';   // 新增导入

// 后端 /api/v1/exec/run/{id} 的返回结构
interface ExecRunResponse {
    status: string;
    process_id?: string;
    url?: string;
}

const categoryIconMap: Record<string, any> = {
    '器件组': Code2,
    'GaN功率组': BarChart3,
    '系统与表征组': Settings,
    '外延组': Workflow,
    'sic开发组': Code2,
    '射频组': BarChart3,
    '工艺工程组': Settings,
    'si基研发组': Code2,
};

// 八大一级分组 + 三个功能型（与后端 file_center.py GROUPS / FUNC_TYPES 保持一致）
const GROUP_OPTIONS = ['器件组', 'GaN功率组', '系统与表征组', '外延组', 'sic开发组', '射频组', '工艺工程组', 'si基研发组'];
const FUNC_TYPE_OPTIONS = ['数据处理', '报告产出', '原始数据'];

export default function ToolMarket() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [searchKeyword, setSearchKeyword] = useState('');
    const [activeSearch, setActiveSearch] = useState('');
    const [selectedGroup, setSelectedGroup] = useState<string | undefined>(undefined);
    const [selectedFuncType, setSelectedFuncType] = useState<string | undefined>(undefined);
    const [expandedGroups, setExpandedGroups] = useState<string[]>([GROUP_OPTIONS[0]]);
    const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [isManageOpen, setIsManageOpen] = useState(false);
    const [editingTool, setEditingTool] = useState<Tool | null>(null);
    const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

    const { data: favorites = [], isLoading: favoritesLoading } = useFavorites();
    const toggleFavorite = useToggleFavorite();
    const deleteTool = useDeleteTool();

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        error,
        refetch,
    } = useToolsInfinite({
        group_name: selectedGroup,
        func_type: selectedFuncType,
        search: activeSearch || undefined,
    });

    const useToolMutation = useUseTool();

    const allTools = useMemo(() => data?.pages.flatMap(page => page) || [], [data]);

    useEffect(() => {
        const toolId = searchParams.get('tool');
        if (!toolId) return;
        api.get<Tool>(`/api/v1/tools/${toolId}`).then((tool) => {
            setSelectedTool(tool);
            setDrawerOpen(true);
            setSearchParams({}, { replace: true });
        }).catch(() => setSearchParams({}, { replace: true }));
    }, [searchParams, setSearchParams]);

    const tools = useMemo(() => {
        if (showFavoritesOnly) {
            const favoriteIds = new Set(favorites.map(f => f.id));
            return allTools.filter(t => favoriteIds.has(t.id));
        }
        return allTools;
    }, [allTools, favorites, showFavoritesOnly]);

    const handleSearch = () => {
        setActiveSearch(searchKeyword);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSearch();
        }
    };

    const clearSearch = () => {
        setSearchKeyword('');
        setActiveSearch('');
    };

    const toggleGroup = (name: string) => {
        setExpandedGroups(prev =>
            prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
        );
    };

    const handleSelectAll = () => {
        setSelectedGroup(undefined);
        setSelectedFuncType(undefined);
    };

    const handleSelectGroup = (group: string) => {
        setSelectedGroup(group);
        setSelectedFuncType(undefined);
    };

    const handleSelectFuncType = (group: string, funcType: string) => {
        setSelectedGroup(group);
        setSelectedFuncType(funcType);
    };

    const handleViewDetail = (tool: Tool) => {
        setSelectedTool(tool);
        setDrawerOpen(true);
    };

    // ============================================================
    // 修改点：增加对 executable 和 streamlit 类型的处理
    // ============================================================
    const handleUseTool = async (id: string) => {
        const tool = allTools.find(t => t.id === id);
        if (!tool) return;

        try {
            // 先记录使用（计数）
            await useToolMutation.mutateAsync(id);

            if (tool.type === 'static') {
                window.open(`${window.location.origin}${tool.source}${tool.entry || 'index.html'}`, '_blank');
            } else if (tool.type === 'external') {
                window.open(tool.source, '_blank');
            } else if (tool.type === 'executable') {
                // 调用后端启动可执行程序
                const response = await api.post<ExecRunResponse>(`/api/v1/exec/run/${tool.id}`);
                if (response.status === 'started') {
                    message.success(`工具「${tool.name}」已启动（进程ID: ${response.process_id}）`);
                    // 可选：可添加轮询状态查询
                } else {
                    message.error('启动失败');
                }
            } else if (tool.type === 'streamlit') {
                // 优先使用 tool.source，否则使用默认的 /streamlit/{id}/ 路径
                const url = tool.source || `/streamlit/${tool.id}/`;
                window.open(url, '_blank');
            } else {
                // internal: 跳转内部路由（需配合路由配置）
                // 这里假设 tool.source 是内部路由路径
                if (tool.source) {
                    window.location.href = tool.source;
                } else {
                    message.info('内部工具，请使用对应功能页面');
                }
            }
        } catch (error) {
            message.error('操作失败：' + (error as Error).message);
        }
    };

    const handleFavorite = (toolId: string) => {
        const isFav = favorites.some(f => f.id === toolId);
        toggleFavorite.mutate({ toolId, isFavorite: isFav });
    };

    const handleEditTool = (tool: Tool) => {
        setEditingTool(tool);
        setIsManageOpen(true);
    };

    const handleManageSuccess = () => {
        refetch();
    };

    const handleDeleteTool = async (id: string) => {
        const tool = allTools.find(t => t.id === id);
        if (!tool) return;
        try {
            await deleteTool.mutateAsync(id);
            message.success(`工具「${tool.name}」已删除`);
            refetch();
        } catch (error) {
            message.error('删除失败：' + (error as Error).message);
        }
    };

    const toggleShowFavorites = () => {
        setShowFavoritesOnly(!showFavoritesOnly);
    };

    // 渲染八组 → 三型 两级侧边栏
    const renderGroupSidebar = () => {
        return GROUP_OPTIONS.map((group) => {
            const isExpanded = expandedGroups.includes(group);
            const isGroupActive = selectedGroup === group && !selectedFuncType;
            const Icon = categoryIconMap[group] || Code2;
            const groupCount = allTools.filter(t => t.group_name === group).length;

            return (
                <div key={group}>
                    <div
                        className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 transition-colors ${isGroupActive ? 'bg-primary-50 text-primary-600 dark:bg-primary-950/30' : 'hover:bg-surface-hover'
                            }`}
                        onClick={() => handleSelectGroup(group)}
                    >
                        <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-text-secondary" />
                            <span className="text-sm font-medium">{group}</span>
                            <Badge variant="secondary" className="text-xs">{groupCount}</Badge>
                        </div>
                        <button
                            onClick={(e) => { e.stopPropagation(); toggleGroup(group); }}
                            className="p-1 hover:bg-surface-active rounded"
                        >
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                    </div>
                    {isExpanded && (
                        <div className="ml-4 mt-1 space-y-1">
                            <div
                                className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 transition-colors ${selectedGroup === group && !selectedFuncType ? 'font-semibold text-primary-600' : 'hover:bg-surface-hover'}`}
                                onClick={() => handleSelectGroup(group)}
                            >
                                <span className="text-sm">{group}（全部功能型）</span>
                            </div>
                            {FUNC_TYPE_OPTIONS.map((ft) => {
                                const ftActive = selectedGroup === group && selectedFuncType === ft;
                                const ftCount = allTools.filter(t => t.group_name === group && t.func_type === ft).length;
                                return (
                                    <div
                                        key={ft}
                                        className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 transition-colors ${ftActive ? 'bg-primary-50 text-primary-600 dark:bg-primary-950/30' : 'hover:bg-surface-hover'}`}
                                        style={{ paddingLeft: '12px' }}
                                        onClick={() => handleSelectFuncType(group, ft)}
                                    >
                                        <span className="text-sm">{ft}</span>
                                        <Badge variant="secondary" className="text-xs">{ftCount}</Badge>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            );
        });
    };

    return (
        <div className="flex h-full gap-6 p-6">
            {/* 左侧分类 */}
            <div className="w-64 shrink-0">
                <div className="sticky top-6 rounded-xl border border-border-default bg-surface-elevated p-4 shadow-sm">
                    <div className="mb-4 font-semibold text-text-primary">分类</div>
                    <div className="space-y-1">
                        <div
                            className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 transition-colors ${selectedGroup === undefined && selectedFuncType === undefined ? 'bg-primary-50 text-primary-600 dark:bg-primary-950/30' : 'hover:bg-surface-hover'
                                }`}
                            onClick={handleSelectAll}
                        >
                            <span className="text-sm font-medium">全部</span>
                            <Badge variant="secondary" className="text-xs">
                                {allTools.length}
                            </Badge>
                        </div>

                        {renderGroupSidebar()}
                    </div>
                </div>
            </div>

            {/* 主内容 */}
            <div className="flex-1 min-w-0">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <h1 className="text-2xl font-bold text-text-primary">工具市场</h1>
                        <span className="text-sm text-text-secondary">
                            共 {tools.length} 个工具
                            {activeSearch && `（搜索："${activeSearch}"）`}
                            {showFavoritesOnly && '（仅显示收藏）'}
                        </span>
                        <Button
                            variant={showFavoritesOnly ? 'primary' : 'secondary'}
                            size="sm"
                            onClick={toggleShowFavorites}
                            className="flex items-center gap-1"
                        >
                            <Heart className={`h-4 w-4 ${showFavoritesOnly ? 'fill-white' : ''}`} />
                            {showFavoritesOnly ? '显示全部' : '我的收藏'}
                        </Button>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative w-80">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                            <Input
                                placeholder="搜索工具名称、描述或标签..."
                                className="pl-9 pr-10"
                                value={searchKeyword}
                                onChange={(e) => setSearchKeyword(e.target.value)}
                                onKeyDown={handleKeyDown}
                            />
                            {searchKeyword && (
                                <button
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
                                    onClick={clearSearch}
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                        <Button variant="primary" onClick={handleSearch}>
                            搜索
                        </Button>
                        <PermissionGuard code="button:tools:manage">
                            <Button variant="secondary" onClick={() => { setEditingTool(null); setIsManageOpen(true); }}>
                                <Settings className="mr-2 h-4 w-4" /> 管理工具
                            </Button>
                        </PermissionGuard>
                    </div>
                </div>

                {error ? (
                    <div className="flex h-96 flex-col items-center justify-center">
                        <p className="text-danger">加载失败：{(error as Error).message}</p>
                        <Button variant="secondary" className="mt-4" onClick={() => refetch()}>
                            重试
                        </Button>
                    </div>
                ) : tools.length === 0 && !isLoading ? (
                    <div className="flex h-96 flex-col items-center justify-center rounded-xl border border-border-default bg-surface-elevated">
                        <Search className="h-16 w-16 text-text-muted" />
                        <p className="mt-4 text-lg font-medium text-text-primary">
                            {showFavoritesOnly ? '暂无收藏工具' : '未找到匹配的工具'}
                        </p>
                        <p className="text-sm text-text-secondary">
                            {showFavoritesOnly ? '去浏览工具并点击 ♡ 收藏吧' : '尝试调整搜索关键词或筛选条件'}
                        </p>
                        {showFavoritesOnly && (
                            <Button variant="secondary" className="mt-4" onClick={toggleShowFavorites}>
                                查看全部工具
                            </Button>
                        )}
                        {!showFavoritesOnly && (
                            <Button variant="secondary" className="mt-4" onClick={clearSearch}>
                                清除筛选
                            </Button>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                            {tools.map((tool) => (
                                <ToolCard
                                    key={tool.id}
                                    tool={tool}
                                    isFavorite={favorites.some(f => f.id === tool.id)}
                                    onFavorite={handleFavorite}
                                    onViewDetail={handleViewDetail}
                                    onUse={handleUseTool}
                                    onEdit={handleEditTool}
                                    onDelete={handleDeleteTool}
                                />
                            ))}
                        </div>

                        {isLoading && (
                            <div className="mt-6 flex justify-center text-text-muted">加载中...</div>
                        )}

                        {hasNextPage && !isLoading && !showFavoritesOnly && (
                            <div className="mt-6 flex justify-center">
                                <Button
                                    variant="secondary"
                                    onClick={() => fetchNextPage()}
                                    disabled={isFetchingNextPage}
                                >
                                    {isFetchingNextPage ? '加载中...' : '加载更多'}
                                </Button>
                            </div>
                        )}
                        {!hasNextPage && tools.length > 0 && (
                            <div className="mt-6 flex justify-center py-4 text-sm text-text-muted">
                                已加载全部工具
                            </div>
                        )}
                    </>
                )}
            </div>

            <ToolDetailDrawer
                tool={selectedTool}
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
            />

            <ToolManageDialog
                open={isManageOpen}
                onOpenChange={setIsManageOpen}
                editingTool={editingTool}
                onSuccess={handleManageSuccess}
            />
        </div>
    );
}
