import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Input, Button } from '@aixsilicon/ui';
import {
    Search,
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
import { api } from '@/lib/api';
import './market.css';

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
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [searchKeyword, setSearchKeyword] = useState('');
    const [activeSearch, setActiveSearch] = useState('');
    const [selectedGroup, setSelectedGroup] = useState<string | undefined>(undefined);
    const [selectedFuncType, setSelectedFuncType] = useState<string | undefined>(undefined);
    const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [isManageOpen, setIsManageOpen] = useState(false);
    const [editingTool, setEditingTool] = useState<Tool | null>(null);
    const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

    const { data: favorites = [], isLoading: favoritesLoading, error: favoritesError, refetch: refetchFavorites } = useFavorites();
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
        if (!showFavoritesOnly) return allTools;
        const keyword = activeSearch.trim().toLocaleLowerCase();
        return favorites.filter(tool =>
            (!selectedGroup || tool.group_name === selectedGroup) &&
            (!selectedFuncType || tool.func_type === selectedFuncType) &&
            (!keyword || [tool.name, tool.description, ...(tool.tags || [])].join(' ').toLocaleLowerCase().includes(keyword))
        );
    }, [allTools, favorites, showFavoritesOnly, selectedGroup, selectedFuncType, activeSearch]);
    const listLoading = showFavoritesOnly ? favoritesLoading : isLoading;
    const listError = showFavoritesOnly ? favoritesError : error;
    const resetFilters = () => {
        setSelectedGroup(undefined);
        setSelectedFuncType(undefined);
        setSearchKeyword('');
        setActiveSearch('');
    };

    const handleSearch = () => {
        setActiveSearch(searchKeyword.trim());
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
            e.preventDefault();
            handleSearch();
        }
    };

    const clearSearch = () => {
        setSearchKeyword('');
        setActiveSearch('');
    };

    const handleSelectAll = () => {
        setSelectedGroup(undefined);
        setSelectedFuncType(undefined);
    };

    const handleSelectGroup = (group: string) => {
        setSelectedGroup(group);
        setSelectedFuncType(undefined);
    };

    const handleViewDetail = (tool: Tool) => {
        setSelectedTool(tool);
        setDrawerOpen(true);
    };

    const handleUseTool = async (id: string) => {
        let pendingWindow: Window | null = null;
        try {
            // A recommendation can open a tool that is not in the current
            // paginated grid, so resolve it before dispatching its launch.
            const tool = allTools.find(t => t.id === id)
                ?? (selectedTool?.id === id ? selectedTool : await api.get<Tool>(`/api/v1/tools/${id}`));
            if (!tool.is_active || tool.status !== 'active') {
                throw new Error('工具当前不可用');
            }
            if (!tool.source) {
                throw new Error('工具尚未配置访问地址');
            }

            if (tool.type === 'executable') {
                throw new Error('服务器可执行工具运行器尚未启用');
            }

            if (tool.type !== 'internal') {
                pendingWindow = window.open('about:blank', '_blank');
                if (!pendingWindow) {
                    throw new Error('浏览器阻止了新窗口，请允许本站弹出窗口后重试');
                }
                pendingWindow.opener = null;
            }

            const launch = await api.post<{ url: string; ticket_required: boolean }>(`/api/v1/tools/${id}/launch`);
            if (tool.type === 'internal') {
                navigate(launch.url);
            } else {
                pendingWindow!.location.replace(new URL(launch.url, window.location.origin).toString());
                pendingWindow = null;
            }

            // 计数失败不应中断已经通过鉴权的工具启动。
            useToolMutation.mutateAsync(id).catch(() => message.warning('工具已打开，但使用次数记录失败'));
        } catch (error) {
            pendingWindow?.close();
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

    return (
        <div className="tool-market">
            <header className="market-heading">
                <div>
                    <p className="market-eyebrow">ENGINEERING TOOLKIT</p>
                    <h1>工具市场</h1>
                    <p className="market-subtitle">找到适合当前工程问题的工具，从数据处理到报告产出。</p>
                </div>
                <PermissionGuard code="button:tools:manage">
                    <Button variant="secondary" onClick={() => { setEditingTool(null); setIsManageOpen(true); }}>
                        <Settings className="mr-2 h-4 w-4" /> 注册工具
                    </Button>
                </PermissionGuard>
            </header>

            <div className="market-layout">
                <aside className="market-sidebar" aria-label="研发分组">
                    <p className="market-eyebrow">研发分组</p>
                    <div className="market-groups">
                        <button type="button" aria-pressed={!selectedGroup} className={!selectedGroup ? 'is-active' : ''} onClick={handleSelectAll}>
                            <Code2 size={16} /> 全部分组
                        </button>
                        {GROUP_OPTIONS.map(group => {
                            const Icon = categoryIconMap[group];
                            return <button type="button" key={group} aria-pressed={selectedGroup === group} className={selectedGroup === group ? 'is-active' : ''} onClick={() => handleSelectGroup(group)}>
                                <Icon size={16} />{group}
                            </button>;
                        })}
                    </div>
                    <p className="market-sidebar-note">先选研发分组，再按功能缩小范围。收藏常用工具，下次快速进入。</p>
                </aside>

                <div className="market-content">
                    <div className="market-toolbar">
                        <div className="market-tabs" aria-label="工具范围">
                            <button type="button" aria-pressed={!showFavoritesOnly} className={!showFavoritesOnly ? 'is-active' : ''} onClick={() => setShowFavoritesOnly(false)}>全部工具</button>
                            <button type="button" aria-pressed={showFavoritesOnly} className={showFavoritesOnly ? 'is-active' : ''} onClick={() => setShowFavoritesOnly(true)}><Heart size={15} /> 我的收藏</button>
                        </div>
                        <div className="market-search">
                            <div className="relative min-w-0 flex-1">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                                <Input aria-label="搜索工具" placeholder="搜索名称、描述或标签" className="pl-9 pr-9" value={searchKeyword} onChange={e => setSearchKeyword(e.target.value)} onKeyDown={handleKeyDown} />
                                {searchKeyword && <button type="button" aria-label="清空搜索" className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted" onClick={clearSearch}><X size={15} /></button>}
                            </div>
                            <Button onClick={handleSearch}>搜索</Button>
                        </div>
                    </div>
                    <div className="market-filters" aria-label="功能筛选">
                        <span>功能</span>
                        {[undefined, ...FUNC_TYPE_OPTIONS].map(ft => <button type="button" key={ft || 'all'} aria-pressed={selectedFuncType === ft} className={selectedFuncType === ft ? 'is-active' : ''} onClick={() => setSelectedFuncType(ft)}>{ft || '全部功能'}</button>)}
                    </div>
                    <div className="market-result-summary" aria-live="polite">
                        <span>{selectedGroup || '全部分组'}{selectedFuncType ? ' / ' + selectedFuncType : ''} · {listLoading ? '加载中…' : '当前显示 ' + tools.length + ' 个工具'}{activeSearch ? ' · “' + activeSearch + '”' : ''}</span>
                        {(selectedGroup || selectedFuncType || activeSearch) && <button type="button" onClick={resetFilters}>重置筛选 <X size={13} /></button>}
                    </div>

                {listError ? (
                    <div className="flex h-96 flex-col items-center justify-center">
                        <p className="text-danger">加载失败：{(listError as Error).message}</p>
                        <Button variant="secondary" className="mt-4" onClick={() => showFavoritesOnly ? refetchFavorites() : refetch()}>
                            重试
                        </Button>
                    </div>
                ) : tools.length === 0 && !listLoading ? (
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
                            <Button variant="secondary" className="mt-4" onClick={resetFilters}>
                                清除筛选
                            </Button>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="market-grid">
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

                        {listLoading && (
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
                        {(showFavoritesOnly || !hasNextPage) && tools.length > 0 && (
                            <div className="mt-6 flex justify-center py-4 text-sm text-text-muted">
                                已加载全部工具
                            </div>
                        )}
                    </>
                )}
            </div>

            </div>

            <ToolDetailDrawer
                tool={selectedTool}
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                onUseTool={handleUseTool}
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
