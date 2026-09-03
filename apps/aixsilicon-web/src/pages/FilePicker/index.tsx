import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    Button,
    Input,
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
    Badge,
    Checkbox,
    message,
} from '@aixsilicon/ui';
import { File as FileIcon, Search, Check, X } from 'lucide-react';
import {
    useFileDivisions,
    useFileTree,
    useFileList,
} from '@/features/files/hooks/useFiles';
import type { FileAsset } from '@/features/files/api/fileApi';

// 供 iframe 内嵌的文件选择器。
// 用法：/files/picker?group=xx&func=xx&ns=xx&multi=true&title=选择文件
// 用户点「确定」后通过 postMessage 回报父子窗口：
//   { type: 'FILE_PICKER_RESULT', files: FileAsset[] }
// 并尝试 window.close()。
export default function FilePicker() {
    const [params] = useSearchParams();
    const presetGroup = params.get('group') || '';
    const presetFunc = params.get('func') || '';
    const presetNs = params.get('ns') || '';
    const multi = params.get('multi') !== 'false';
    const title = params.get('title') || '选择文件';

    const { data: divisions = [] } = useFileDivisions();
    const { data: tree } = useFileTree();

    // 筛选状态（初始用 query 预填，仍可改）
    const [group, setGroup] = useState(presetGroup);
    const [funcType, setFuncType] = useState(presetFunc);
    const [namespaceFilter, setNamespaceFilter] = useState(presetNs);
    const [keyword, setKeyword] = useState('');

    const listParams = useMemo(() => ({
        group_name: group || undefined,
        func_type: funcType || undefined,
        namespace: namespaceFilter || undefined,
        keyword: keyword || undefined,
        archived: false,
        page: 1,
        page_size: 200,
    }), [group, funcType, namespaceFilter, keyword]);

    const { data: listData, isLoading } = useFileList(listParams);
    const files: FileAsset[] = listData?.items ?? [];

    const availableGroups = divisions.map((d) => d.group_name);
    const filterFuncs = useMemo(() => {
        const d = divisions.find((x) => x.group_name === group);
        return d ? d.func_types : [];
    }, [divisions, group]);
    const allNamespaces = useMemo(() => {
        const set = new Set<string>();
        (tree || []).forEach((g) => {
            (g.func_types || []).forEach((ft: any) => {
                (ft.tools || []).forEach((t: any) => set.add(t.namespace));
            });
        });
        return Array.from(set).sort();
    }, [tree]);

    // 已选 id 集合
    const [selected, setSelected] = useState<Set<string>>(new Set());

    const toggle = (id: string) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else {
                if (multi) next.add(id);
                else { next.clear(); next.add(id); }
            }
            return next;
        });
    };

    const selectedFiles = files.filter((f) => selected.has(f.id));

    const handleConfirm = () => {
        if (selectedFiles.length === 0) {
            message.warning('请先选择文件');
            return;
        }
        window.parent.postMessage(
            { type: 'FILE_PICKER_RESULT', files: selectedFiles },
            '*',
        );
        setSelected(new Set());
        // iframe 内自动关闭
        window.close();
    };

    const handleCancel = () => {
        window.parent.postMessage({ type: 'FILE_PICKER_CANCEL' }, '*');
        window.close();
    };

    function formatSize(bytes: number): string {
        if (!bytes && bytes !== 0) return '-';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    return (
        <div className="flex h-screen flex-col bg-surface">
            {/* 顶部标题栏 */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div className="flex items-center gap-2">
                    <FileIcon className="h-4 w-4 text-text-secondary" />
                    <span className="text-sm font-semibold text-text-primary">{title}</span>
                </div>
                <button
                    type="button"
                    onClick={handleCancel}
                    className="rounded-md p-1 text-text-secondary hover:bg-muted"
                    title="关闭"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>

            {/* 筛选区 */}
            <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2">
                <div className="flex items-center gap-1">
                    <Select value={group} onValueChange={(v) => { setGroup(v); setFuncType(''); }}>
                        <SelectTrigger className="h-8 w-36">
                            <SelectValue placeholder="全部分组" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="__all">全部分组</SelectItem>
                            {availableGroups.map((g) => (
                                <SelectItem key={g} value={g}>{g}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={funcType} onValueChange={setFuncType}>
                        <SelectTrigger className="h-8 w-36">
                            <SelectValue placeholder="全部功能型" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="__all">全部功能型</SelectItem>
                            {filterFuncs.map((f) => (
                                <SelectItem key={f} value={f}>{f}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={namespaceFilter} onValueChange={setNamespaceFilter}>
                        <SelectTrigger className="h-8 w-36">
                            <SelectValue placeholder="全部工具" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="__all">全部工具</SelectItem>
                            {allNamespaces.map((n) => (
                                <SelectItem key={n} value={n}>{n}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="relative flex-1 min-w-[160px]">
                    <Search className="absolute left-2.5 top-2 h-4 w-4 text-text-muted" />
                    <Input
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        placeholder="按文件名搜索..."
                        className="h-8 pl-8"
                    />
                </div>
            </div>

            {/* 文件列表 */}
            <div className="flex-1 overflow-y-auto p-4">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-10">
                                {multi && (
                                    <Checkbox
                                        checked={files.length > 0 && selected.size === files.length}
                                        onCheckedChange={(v) => {
                                            if (v) {
                                                const s = new Set(files.map((f) => f.id));
                                                setSelected(s);
                                            } else {
                                                setSelected(new Set());
                                            }
                                        }}
                                    />
                                )}
                            </TableHead>
                            <TableHead>文件名</TableHead>
                            <TableHead>分组 / 功能型 / 工具</TableHead>
                            <TableHead>大小</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={4} className="py-10 text-center text-text-muted">加载中...</TableCell>
                            </TableRow>
                        ) : files.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="py-10 text-center text-text-muted">暂无符合条件的文件</TableCell>
                            </TableRow>
                        ) : (
                            files.map((f) => (
                                <TableRow
                                    key={f.id}
                                    className={`cursor-pointer ${selected.has(f.id) ? 'bg-primary-50' : ''}`}
                                    onClick={() => toggle(f.id)}
                                >
                                    <TableCell>
                                        <div onClick={(e) => e.stopPropagation()}>
                                            <Checkbox
                                                checked={selected.has(f.id)}
                                                onCheckedChange={() => toggle(f.id)}
                                            />
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <FileIcon className="h-4 w-4 text-text-muted shrink-0" />
                                            <span className="max-w-[280px] truncate" title={f.filename}>{f.filename}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-sm">
                                            <span>{f.group_name}</span>
                                            <span className="text-text-muted"> / </span>
                                            <span>{f.func_type}</span>
                                            <span className="text-text-muted"> / </span>
                                            <Badge variant="info">{f.namespace}</Badge>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-sm text-text-secondary">{formatSize(f.size)}</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* 底部操作栏 */}
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
                <div className="text-sm text-text-secondary">
                    已选 <span className="font-semibold text-text-primary">{selectedFiles.length}</span> 个文件
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="secondary" onClick={handleCancel}>取消</Button>
                    <Button onClick={handleConfirm} disabled={selectedFiles.length === 0}>
                        <Check className="mr-1.5 h-4 w-4" /> 确定
                    </Button>
                </div>
            </div>
        </div>
    );
}
