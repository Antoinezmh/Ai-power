import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Archive,
    ArchiveRestore,
    ArrowRight,
    Bot,
    Download,
    File as FileIcon,
    FileUp,
    FolderOpen,
    Link2,
    Pencil,
    RefreshCw,
    Search,
    Send,
    Sparkles,
    Trash2,
    Upload,
    WandSparkles,
} from 'lucide-react';
import {
    Badge,
    Button,
    Checkbox,
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    Input,
    PopConfirm,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    message,
} from '@aixsilicon/ui';
import {
    useDeleteFile,
    useFileDivisions,
    useFileList,
    useFileScopes,
    useFileTree,
    useUpdateFile,
} from '@/features/files/hooks/useFiles';
import type { FileGroupNode, FileScopesView } from '@/features/files/api/fileApi';
import { fileApi, uploadFile } from '@/features/files/api/fileApi';
import { useToolsInfinite } from '@/features/tools/hooks/useTools';

const LEVEL_RANK: Record<string, number> = { read: 1, write: 2, manage: 3 };
const ALL_VALUE = '__all';

function fileAccessLevel(scopes: FileScopesView | undefined, group: string, func: string, ns: string): string {
    if (!scopes) return '';
    if (scopes.is_admin) return 'manage';
    const currentGroup = (Array.isArray(scopes.groups) ? scopes.groups : []).find((item) => item?.group_name === group);
    const currentFunc = currentGroup && (Array.isArray(currentGroup.func_types) ? currentGroup.func_types : []).find((item) => item?.func_type === func);
    if (!currentFunc) return '';
    if (currentFunc.tools == null) return currentFunc.access_level;
    return (Array.isArray(currentFunc.tools) ? currentFunc.tools : []).find((item) => item?.namespace === ns)?.access_level || '';
}

function hasLevel(scopes: FileScopesView | undefined, required: string): boolean {
    if (!scopes) return false;
    if (scopes.is_admin) return true;
    const requiredRank = LEVEL_RANK[required] ?? 0;
    return (Array.isArray(scopes.groups) ? scopes.groups : []).some((group) =>
        (LEVEL_RANK[group.access_level] ?? 0) >= requiredRank ||
        (Array.isArray(group.func_types) ? group.func_types : []).some((func) =>
            (LEVEL_RANK[func.access_level] ?? 0) >= requiredRank ||
            (Array.isArray(func.tools) ? func.tools : []).some((tool) => (LEVEL_RANK[tool.access_level] ?? 0) >= requiredRank),
        ),
    );
}

function collectNamespaces(tree: FileGroupNode[] | undefined): string[] {
    const namespaces = new Set<string>();
    (tree || []).forEach((group) => (group.func_types || []).forEach((func) => (func.tools || []).forEach((tool) => namespaces.add(tool.namespace))));
    return Array.from(namespaces).sort();
}

function formatSize(bytes: number): string {
    if (!bytes && bytes !== 0) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatTime(value?: string | null): string {
    if (!value) return '-';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString();
}

function Progress({ percent }: { percent: number }) {
    return <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-subtle"><div className="h-full rounded-full bg-primary-600 transition-all duration-150" style={{ width: `${Math.max(0, Math.min(100, percent))}%` }} /></div>;
}

export default function FileCenter() {
    const navigate = useNavigate();
    const { data: divisions = [] } = useFileDivisions();
    const { data: tree } = useFileTree();
    const { data: scopes } = useFileScopes();
    const { data: toolPages } = useToolsInfinite({});
    const tools = useMemo(() => toolPages?.pages.flat() ?? [], [toolPages]);

    const [group, setGroup] = useState('');
    const [funcType, setFuncType] = useState('');
    const [namespaceFilter, setNamespaceFilter] = useState('');
    const [keyword, setKeyword] = useState('');
    const [showArchived, setShowArchived] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const listParams = useMemo(() => ({
        group_name: group || undefined,
        func_type: funcType || undefined,
        namespace: namespaceFilter || undefined,
        keyword: keyword || undefined,
        archived: showArchived,
        page: 1,
        page_size: 100,
    }), [group, funcType, namespaceFilter, keyword, showArchived]);
    const { data: listData, isLoading, isFetching, refetch } = useFileList(listParams);
    const files = listData?.items ?? [];
    const total = listData?.total ?? 0;
    const updateFile = useUpdateFile();
    const deleteFile = useDeleteFile();

    const [uploadOpen, setUploadOpen] = useState(false);
    const [upGroup, setUpGroup] = useState('');
    const [upFunc, setUpFunc] = useState('');
    const [upNs, setUpNs] = useState('');
    const [upTags, setUpTags] = useState('');
    const [upFiles, setUpFiles] = useState<File[]>([]);
    const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
    const [upUploading, setUpUploading] = useState(false);
    const [dragOver, setDragOver] = useState(false);

    const [editOpen, setEditOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<any>(null);
    const [editName, setEditName] = useState('');
    const [editGroup, setEditGroup] = useState('');
    const [editFunc, setEditFunc] = useState('');
    const [editNs, setEditNs] = useState('');
    const [editTags, setEditTags] = useState('');

    const isAdmin = scopes?.is_admin ?? false;
    const scopesLoaded = scopes !== undefined;
    const availableGroups = useMemo(() => {
        const allowed = new Set((Array.isArray(scopes?.groups) ? scopes.groups : []).map((item) => item.group_name));
        return divisions.map((item) => item.group_name).filter((name) => !scopesLoaded || isAdmin || allowed.has(name));
    }, [divisions, scopes?.groups, scopesLoaded, isAdmin]);
    const canWrite = useMemo(() => hasLevel(scopes, 'write'), [scopes]);
    const filterFuncs = useMemo(() => divisions.find((item) => item.group_name === group)?.func_types ?? [], [divisions, group]);
    const upFuncs = useMemo(() => divisions.find((item) => item.group_name === upGroup)?.func_types ?? [], [divisions, upGroup]);
    const editFuncs = useMemo(() => divisions.find((item) => item.group_name === editGroup)?.func_types ?? [], [divisions, editGroup]);
    const namespaces = useMemo(() => Array.from(new Set([...collectNamespaces(tree), ...tools.map((tool) => tool.namespace).filter(Boolean) as string[]])).sort(), [tree, tools]);
    const selectedFiles = useMemo(() => files.filter((file) => selectedIds.has(file.id)), [files, selectedIds]);

    const resetUpload = () => {
        setUpGroup(''); setUpFunc(''); setUpNs(''); setUpTags(''); setUpFiles([]); setUploadProgress({});
    };
    const openUpload = () => { resetUpload(); setUploadOpen(true); };
    const normalizeAll = (value: string) => value === ALL_VALUE ? '' : value;
    const onDropFiles = (incoming: FileList | null) => {
        if (incoming?.length) setUpFiles((current) => [...current, ...Array.from(incoming)]);
        setDragOver(false);
    };
    const handleUpload = async () => {
        if (!upGroup || !upFunc || !upNs.trim()) return message.warning('请填写分组、功能型和工具空间');
        if (!upFiles.length) return message.warning('请选择要上传的文件');
        setUpUploading(true);
        const progress: Record<string, number> = {};
        try {
            for (const file of upFiles) {
                // 当前整合后端提供稳定的 multipart 上传接口；原有分片合并服务尚未启用。
                // 保持逐个上传，避免 SQLite/磁盘同时写入造成失败。
                progress[file.name] = 1; setUploadProgress({ ...progress });
                await uploadFile({
                    file, group_name: upGroup, func_type: upFunc, namespace: upNs.trim(),
                    tags: upTags ? upTags.split(',').map((tag) => tag.trim()).filter(Boolean) : undefined,
                });
                progress[file.name] = 100; setUploadProgress({ ...progress });
            }
            message.success(`成功上传 ${upFiles.length} 个文件`);
            setUploadOpen(false); resetUpload(); refetch();
        } catch (error) {
            message.error(`上传失败：${(error as Error).message}`);
        } finally { setUpUploading(false); }
    };
    const openEdit = (file: any) => {
        setEditTarget(file); setEditName(file.filename); setEditGroup(file.group_name); setEditFunc(file.func_type); setEditNs(file.namespace); setEditTags((file.tags || []).join(',')); setEditOpen(true);
    };
    const handleEdit = async () => {
        if (!editName.trim()) return message.warning('文件名不能为空');
        try {
            await updateFile.mutateAsync({ id: editTarget.id, data: {
                filename: editName.trim(), group_name: editGroup || undefined, func_type: editFunc || undefined,
                namespace: editNs.trim() || undefined, tags: editTags ? editTags.split(',').map((tag) => tag.trim()).filter(Boolean) : [],
            } });
            message.success('文件信息已更新'); setEditOpen(false);
        } catch (error) { message.error(`更新失败：${(error as Error).message}`); }
    };
    const handleArchive = async (file: any) => {
        try { await updateFile.mutateAsync({ id: file.id, data: { is_archived: !file.is_archived } }); message.success(file.is_archived ? '已取消归档' : '已归档'); }
        catch (error) { message.error(`归档操作失败：${(error as Error).message}`); }
    };
    const handleDelete = async (file: any) => {
        try { await deleteFile.mutateAsync(file.id); message.success('文件已删除'); setSelectedIds((current) => { const next = new Set(current); next.delete(file.id); return next; }); }
        catch (error) { message.error(`删除失败：${(error as Error).message}`); }
    };
    const startAgentTask = (task: string) => {
        const context = selectedFiles.length ? `已选文件：${selectedFiles.map((file) => file.filename).join('、')}。` : '当前尚未选择文件。';
        const params = new URLSearchParams({ context: 'files', prompt: `${task}。${context}` });
        navigate(`/chat?${params.toString()}`);
    };
    const toggleFile = (id: string) => setSelectedIds((current) => {
        const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next;
    });
    const selectAll = (checked: boolean) => setSelectedIds(checked ? new Set(files.map((file) => file.id)) : new Set());
    const activateSlot = (tool: typeof tools[number]) => {
        setGroup(tool.group_name || ''); setFuncType(tool.func_type || ''); setNamespaceFilter(tool.namespace || ''); setSelectedIds(new Set());
    };

    return <div className="mx-auto w-full max-w-7xl space-y-7 pb-10">
        <section className="relative overflow-hidden rounded-[2rem] border border-border-subtle bg-surface-elevated px-6 py-8 shadow-sm sm:px-9 sm:py-10">
            <div className="absolute right-0 top-0 h-48 w-48 translate-x-1/3 -translate-y-1/3 rounded-full bg-primary-100/70 blur-3xl dark:bg-primary-900/25" />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div><p className="text-xs font-semibold tracking-[0.18em] text-primary-600 dark:text-primary-400">AI POWER / DATA WORKSPACE</p><h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-text-primary sm:text-4xl">让研发数据进入工具与 AI 工作流</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-text-secondary sm:text-base">每份文件都归入明确的工具空间，可继续交给计算工具、动态容器或 AI 助手处理。</p></div>
                <div className="flex flex-wrap gap-3"><Button variant="secondary" onClick={() => startAgentTask('帮我分析文件中心中的研发资料')} className="rounded-full"><Sparkles className="mr-2 h-4 w-4" />与 AI 对话</Button>{canWrite && <Button onClick={openUpload} className="rounded-full"><Upload className="mr-2 h-4 w-4" />上传文件</Button>}</div>
            </div>
            <div className="relative mt-8 flex flex-wrap gap-x-7 gap-y-3 border-t border-border-subtle pt-5 text-sm"><span className="text-text-secondary"><b className="mr-1 font-semibold text-text-primary">{total}</b>当前视图文件</span><span className="text-text-secondary"><b className="mr-1 font-semibold text-text-primary">{tools.length}</b>工具插槽已登记</span><span className="text-text-secondary"><b className="mr-1 font-semibold text-text-primary">{selectedFiles.length}</b>已选择为 AI 上下文</span></div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
            <main className="min-w-0 rounded-[1.5rem] border border-border-default bg-surface-elevated">
                <div className="border-b border-border-subtle px-5 py-5 sm:px-6">
                    <div className="flex flex-wrap items-end gap-3">
                        <FilterSelect label="分组" value={group} placeholder="全部分组" options={availableGroups} onChange={(value) => { setGroup(normalizeAll(value)); setFuncType(''); }} />
                        <FilterSelect label="功能型" value={funcType} placeholder="全部功能型" options={filterFuncs} onChange={(value) => setFuncType(normalizeAll(value))} disabled={!group} />
                        <FilterSelect label="工具空间" value={namespaceFilter} placeholder="全部工具" options={namespaces} onChange={(value) => setNamespaceFilter(normalizeAll(value))} />
                        <div className="min-w-[190px] flex-1"><label className="text-xs font-medium text-text-secondary">搜索</label><div className="relative mt-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-text-muted" /><Input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="按文件名搜索" className="rounded-xl pl-9" /></div></div>
                        <label className="flex h-10 items-center gap-2 rounded-xl border border-border-default px-3 text-sm text-text-secondary"><Checkbox checked={showArchived} onCheckedChange={(value) => { setShowArchived(Boolean(value)); setSelectedIds(new Set()); }} />归档视图</label>
                        <Button variant="ghost" size="icon" title="刷新" onClick={() => refetch()} className="rounded-xl"><RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} /></Button>
                    </div>
                </div>
                <div className="flex items-center justify-between px-5 py-4 sm:px-6"><div><p className="text-xs font-semibold tracking-[0.14em] text-text-tertiary">FILE BROWSER</p><p className="mt-1 text-sm text-text-secondary">{showArchived ? '查看已归档文件' : '按工具空间浏览当前研发资料'}</p></div>{selectedFiles.length > 0 && <button onClick={() => startAgentTask('基于已选文件生成一份研发处理计划')} className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-3 py-2 text-sm font-medium text-primary-700 transition-colors hover:bg-primary-100 dark:bg-primary-950/30 dark:text-primary-300"><WandSparkles className="h-4 w-4" />交给 Agent</button>}</div>
                <div className="overflow-x-auto border-t border-border-subtle">
                    <Table>
                        <TableHeader><TableRow><TableHead className="w-10"><Checkbox checked={files.length > 0 && selectedFiles.length === files.length} onCheckedChange={(value) => selectAll(Boolean(value))} /></TableHead><TableHead>文件</TableHead><TableHead>工具空间</TableHead><TableHead className="hidden lg:table-cell">标签</TableHead><TableHead className="hidden md:table-cell">更新时间</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader>
                        <TableBody>{isLoading ? <TableRow><TableCell colSpan={6} className="py-16 text-center text-text-muted">正在整理文件列表…</TableCell></TableRow> : files.length === 0 ? <TableRow><TableCell colSpan={6} className="py-16 text-center"><FolderOpen className="mx-auto h-7 w-7 text-text-tertiary" /><p className="mt-3 font-medium text-text-primary">这里还没有文件</p><p className="mt-1 text-sm text-text-secondary">上传资料，或从工具市场先创建一个工具空间。</p>{canWrite && <Button variant="secondary" onClick={openUpload} className="mt-5 rounded-full">上传第一份文件</Button>}</TableCell></TableRow> : files.map((file) => {
                            const levelRank = LEVEL_RANK[fileAccessLevel(scopes, file.group_name, file.func_type, file.namespace)] ?? 0;
                            const canEdit = levelRank >= LEVEL_RANK.write;
                            const canDelete = levelRank >= LEVEL_RANK.manage;
                            return <TableRow key={file.id} className={selectedIds.has(file.id) ? 'bg-primary-50/60 dark:bg-primary-950/15' : ''}><TableCell><Checkbox checked={selectedIds.has(file.id)} onCheckedChange={() => toggleFile(file.id)} /></TableCell><TableCell><div className="flex min-w-[180px] items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-subtle text-text-secondary"><FileIcon className="h-4 w-4" /></span><span className="min-w-0"><span className="block truncate font-medium text-text-primary" title={file.filename}>{file.filename}</span><span className="mt-0.5 block text-xs text-text-tertiary">{formatSize(file.size)}{file.is_archived ? ' · 已归档' : ''}</span></span></div></TableCell><TableCell><button onClick={() => { setGroup(file.group_name); setFuncType(file.func_type); setNamespaceFilter(file.namespace); }} className="min-w-[150px] text-left"><span className="block text-xs text-text-tertiary">{file.group_name} · {file.func_type}</span><span className="mt-1 inline-flex rounded-md bg-surface-subtle px-2 py-0.5 text-xs font-medium text-text-secondary">{file.namespace}</span></button></TableCell><TableCell className="hidden lg:table-cell"><div className="flex max-w-40 flex-wrap gap-1">{(file.tags || []).slice(0, 2).map((tag, index) => <Badge key={`${tag}-${index}`} variant="primary" className="text-xs">{tag}</Badge>)}{!file.tags?.length && <span className="text-sm text-text-muted">—</span>}</div></TableCell><TableCell className="hidden whitespace-nowrap text-sm text-text-secondary md:table-cell">{formatTime(file.updated_at || file.created_at)}</TableCell><TableCell><div className="flex justify-end gap-1"><Button variant="ghost" size="icon" title="下载" onClick={() => fileApi.download(file.id, file.filename)} className="rounded-xl"><Download className="h-4 w-4" /></Button>{canEdit && <><Button variant="ghost" size="icon" title="编辑或移动" onClick={() => openEdit(file)} className="rounded-xl"><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" title={file.is_archived ? '取消归档' : '归档'} onClick={() => handleArchive(file)} className="rounded-xl">{file.is_archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}</Button></>}{canDelete && <PopConfirm title="删除文件" description={`确定删除「${file.filename}」吗？物理文件将一并删除，不可恢复。`} confirmText="删除" onConfirm={() => handleDelete(file)}><Button variant="ghost" size="icon" className="rounded-xl text-danger hover:text-danger"><Trash2 className="h-4 w-4" /></Button></PopConfirm>}</div></TableCell></TableRow>;
                        })}</TableBody>
                    </Table>
                </div>
            </main>

            <aside className="space-y-5 xl:sticky xl:top-5 xl:h-fit">
                <section className="overflow-hidden rounded-[1.5rem] bg-[#111827] p-6 text-white shadow-lg"><div className="flex items-center justify-between"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10"><Bot className="h-5 w-5" /></span><span className="text-xs font-semibold tracking-[0.14em] text-white/45">FILE AGENT</span></div><h2 className="mt-7 text-xl font-semibold tracking-[-0.03em]">让 Agent 从文件上下文开始</h2><p className="mt-2 text-sm leading-6 text-white/60">选择文件后，Agent 能带着名称、位置和工具空间进入对话，帮助你组织下一步工作。</p><div className="mt-5 space-y-2"><AgentPrompt label="识别这批测试数据" onClick={() => startAgentTask('识别已选文件可能包含的测试数据，并建议下一步')} /><AgentPrompt label="为文件推荐合适工具" onClick={() => startAgentTask('根据已选文件推荐可使用的研发工具')} /><AgentPrompt label="生成试验处理清单" onClick={() => startAgentTask('根据已选文件生成试验处理与归档清单')} /></div><button onClick={() => startAgentTask('帮我开始一次文件分析')} className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-white">进入 AI 对话 <Send className="h-3.5 w-3.5" /></button></section>
                <section className="rounded-[1.5rem] border border-border-default bg-surface-elevated p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold tracking-[0.15em] text-text-tertiary">TOOL SLOTS</p><h2 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-text-primary">工具插槽</h2></div><Link2 className="h-5 w-5 text-text-tertiary" /></div><p className="mt-2 text-sm leading-6 text-text-secondary">每个已登记工具都可绑定一个文件空间，静态工具、动态容器与 Agent 共用同一份上下文。</p><div className="mt-4 space-y-2">{tools.length ? tools.slice(0, 5).map((tool) => <button key={tool.id} onClick={() => activateSlot(tool)} className="group flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-surface-subtle"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-surface-subtle text-sm">{tool.icon || '◫'}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-text-primary">{tool.name}</span><span className="block truncate text-xs text-text-tertiary">{tool.namespace || '尚未绑定空间'} · {tool.type}</span></span><ArrowRight className="h-3.5 w-3.5 text-text-tertiary transition-transform group-hover:translate-x-1" /></button>) : <p className="rounded-xl bg-surface-subtle px-3 py-4 text-sm text-text-secondary">工具市场中登记的工具会显示在这里。</p>}</div><button onClick={() => navigate('/tools')} className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700">管理工具插槽 <ArrowRight className="h-3.5 w-3.5" /></button></section>
                <section className="rounded-[1.5rem] border border-border-default bg-surface-elevated p-5"><p className="text-xs font-semibold tracking-[0.15em] text-text-tertiary">DATA HANDOFF</p><div className="mt-3 flex gap-3"><FileUp className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" /><p className="text-sm leading-6 text-text-secondary">文件保留在平台空间；工具或 Agent 通过选中的文件上下文获取输入，不把资料散落到不同工具目录。</p></div></section>
            </aside>
        </div>

        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}><DialogContent className="sm:max-w-xl"><DialogHeader><DialogTitle>上传到工具空间</DialogTitle></DialogHeader><div className="space-y-5 py-2"><div><label className="text-sm font-medium text-text-primary">文件</label><div className={`mt-2 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-colors ${dragOver ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/20' : 'border-border-default bg-surface-subtle/60 hover:border-primary-300'}`} onDragOver={(event) => { event.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={(event) => { event.preventDefault(); onDropFiles(event.dataTransfer.files); }} onClick={() => document.getElementById('workspace-file-picker')?.click()}><Upload className="mb-3 h-7 w-7 text-primary-600" /><p className="text-sm font-medium text-text-primary">拖入文件，或点击选择</p><p className="mt-1 text-xs text-text-tertiary">支持多文件，单文件最大 200MB</p></div><input id="workspace-file-picker" type="file" multiple className="hidden" onChange={(event) => { onDropFiles(event.target.files); event.target.value = ''; }} />{upFiles.length > 0 && <div className="mt-3 max-h-40 space-y-2 overflow-y-auto">{upFiles.map((file, index) => <div key={`${file.name}-${index}`} className="flex items-center gap-3 rounded-xl bg-surface-subtle px-3 py-2"><FileIcon className="h-4 w-4 text-text-tertiary" /><span className="min-w-0 flex-1 truncate text-sm text-text-primary">{file.name}</span><span className="text-xs text-text-tertiary">{uploadProgress[file.name] === undefined ? formatSize(file.size) : `${Math.round(uploadProgress[file.name])}%`}</span><Button variant="ghost" size="sm" onClick={() => setUpFiles((current) => current.filter((_, currentIndex) => currentIndex !== index))} disabled={upUploading}>移除</Button></div>)}{upUploading && Object.entries(uploadProgress).map(([name, percent]) => <div key={`progress-${name}`} className="px-1"><div className="mb-1 flex justify-between text-xs text-text-secondary"><span className="truncate">{name}</span><span>{Math.round(percent)}%</span></div><Progress percent={percent} /></div>)}</div>}</div><div className="grid gap-4 sm:grid-cols-2"><WorkspaceSelect label="一级分组" value={upGroup} placeholder="选择分组" options={availableGroups} onChange={(value) => { setUpGroup(value); setUpFunc(''); }} /><WorkspaceSelect label="功能型" value={upFunc} placeholder="选择功能型" options={upFuncs} onChange={setUpFunc} /></div><div><label className="text-sm font-medium text-text-primary">工具空间 namespace</label><Input value={upNs} onChange={(event) => setUpNs(event.target.value)} placeholder="如 mosfet-fom、htol-monitor" className="mt-1 rounded-xl" /><p className="mt-1.5 text-xs leading-5 text-text-tertiary">与工具市场中工具的 namespace 保持一致，文件会自动归入对应工具插槽。</p></div><div><label className="text-sm font-medium text-text-primary">标签 <span className="font-normal text-text-tertiary">（逗号分隔）</span></label><Input value={upTags} onChange={(event) => setUpTags(event.target.value)} placeholder="如 double-pulse, wafer-01" className="mt-1 rounded-xl" /></div></div><DialogFooter><Button variant="secondary" onClick={() => setUploadOpen(false)}>取消</Button><Button onClick={handleUpload} disabled={upUploading}>{upUploading ? '上传中…' : '上传到工作区'}</Button></DialogFooter></DialogContent></Dialog>

        <Dialog open={editOpen} onOpenChange={setEditOpen}><DialogContent className="sm:max-w-xl"><DialogHeader><DialogTitle>编辑文件归属</DialogTitle></DialogHeader><div className="space-y-5 py-2"><div><label className="text-sm font-medium text-text-primary">文件名</label><Input value={editName} onChange={(event) => setEditName(event.target.value)} className="mt-1 rounded-xl" /></div><div className="grid gap-4 sm:grid-cols-2"><WorkspaceSelect label="一级分组" value={editGroup} placeholder="选择分组" options={availableGroups} onChange={(value) => { setEditGroup(value); setEditFunc(''); }} /><WorkspaceSelect label="功能型" value={editFunc} placeholder="选择功能型" options={editFuncs} onChange={setEditFunc} /></div><div><label className="text-sm font-medium text-text-primary">工具空间 namespace</label><Input value={editNs} onChange={(event) => setEditNs(event.target.value)} className="mt-1 rounded-xl" /></div><div><label className="text-sm font-medium text-text-primary">标签 <span className="font-normal text-text-tertiary">（逗号分隔）</span></label><Input value={editTags} onChange={(event) => setEditTags(event.target.value)} className="mt-1 rounded-xl" /></div></div><DialogFooter><Button variant="secondary" onClick={() => setEditOpen(false)}>取消</Button><Button onClick={handleEdit} disabled={updateFile.isPending}>{updateFile.isPending ? '保存中…' : '保存变更'}</Button></DialogFooter></DialogContent></Dialog>
    </div>;
}

function FilterSelect({ label, value, placeholder, options, onChange, disabled = false }: { label: string; value: string; placeholder: string; options: string[]; onChange: (value: string) => void; disabled?: boolean }) {
    return <div className="min-w-[128px]"><label className="text-xs font-medium text-text-secondary">{label}</label><Select value={value || ALL_VALUE} onValueChange={onChange} disabled={disabled}><SelectTrigger className="mt-1 rounded-xl"><SelectValue placeholder={placeholder} /></SelectTrigger><SelectContent><SelectItem value={ALL_VALUE}>{placeholder}</SelectItem>{options.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select></div>;
}

function WorkspaceSelect({ label, value, placeholder, options, onChange }: { label: string; value: string; placeholder: string; options: string[]; onChange: (value: string) => void }) {
    return <div><label className="text-sm font-medium text-text-primary">{label}</label><Select value={value} onValueChange={onChange}><SelectTrigger className="mt-1 rounded-xl"><SelectValue placeholder={placeholder} /></SelectTrigger><SelectContent>{options.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select></div>;
}

function AgentPrompt({ label, onClick }: { label: string; onClick: () => void }) {
    return <button onClick={onClick} className="flex w-full items-center justify-between rounded-xl bg-white/[0.07] px-3 py-2.5 text-left text-sm text-white/80 transition-colors hover:bg-white/[0.12]"><span>{label}</span><ArrowRight className="h-3.5 w-3.5 text-white/45" /></button>;
}
