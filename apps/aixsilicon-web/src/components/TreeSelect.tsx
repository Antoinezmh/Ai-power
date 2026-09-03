import { useState, useEffect } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { ChevronDown, ChevronRight, Search, X } from 'lucide-react';
import { cn } from '@aixsilicon/ui';

export interface TreeNode {
    id: string;
    name: string;
    children?: TreeNode[];
}

interface TreeSelectProps {
    data: TreeNode[];
    value?: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
}

// 递归渲染树节点
function TreeItem({
    node,
    level = 0,
    selectedId,
    onSelect,
    expandedIds,
    toggleExpand,
}: {
    node: TreeNode;
    level: number;
    selectedId: string;
    onSelect: (id: string) => void;
    expandedIds: Set<string>;
    toggleExpand: (id: string) => void;
}) {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedIds.has(node.id);
    const isSelected = selectedId === node.id;

    return (
        <div>
            <div
                className={cn(
                    'flex cursor-pointer items-center gap-1 rounded-md px-2 py-1.5 text-sm hover:bg-surface-hover',
                    isSelected && 'bg-primary-50 text-primary-600 dark:bg-primary-950/30'
                )}
                style={{ paddingLeft: `${level * 20 + 8}px` }}
                onClick={() => onSelect(node.id)}
            >
                {hasChildren && (
                    <button
                        onClick={(e) => { e.stopPropagation(); toggleExpand(node.id); }}
                        className="mr-1 p-0.5 hover:bg-surface-active rounded"
                    >
                        {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    </button>
                )}
                <span>{node.name}</span>
                {isSelected && <span className="ml-auto text-primary-600">✓</span>}
            </div>
            {hasChildren && isExpanded && (
                <div>
                    {node.children!.map(child => (
                        <TreeItem
                            key={child.id}
                            node={child}
                            level={level + 1}
                            selectedId={selectedId}
                            onSelect={onSelect}
                            expandedIds={expandedIds}
                            toggleExpand={toggleExpand}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export function TreeSelect({
    data,
    value,
    onChange,
    placeholder = '请选择分类',
    className,
    disabled = false,
}: TreeSelectProps) {
    const [open, setOpen] = useState(false);
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [search, setSearch] = useState('');

    // 默认展开第一层
    useEffect(() => {
        const firstLevelIds = data.map(n => n.id);
        setExpandedIds(new Set(firstLevelIds));
    }, [data]);

    const toggleExpand = (id: string) => {
        setExpandedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            return newSet;
        });
    };

    const handleSelect = (id: string) => {
        onChange(id);
        setOpen(false);
        setSearch('');
    };

    // 扁平化树用于搜索
    const flattenTree = (nodes: TreeNode[], prefix = ''): TreeNode[] => {
        let result: TreeNode[] = [];
        nodes.forEach(node => {
            result.push({ ...node, name: prefix + node.name });
            if (node.children) {
                result = result.concat(flattenTree(node.children, prefix + '  '));
            }
        });
        return result;
    };

    const flatData = flattenTree(data);
    const selectedNode = flatData.find(n => n.id === value);

    const filteredData = search
        ? flatData.filter(n => n.name.toLowerCase().includes(search.toLowerCase()))
        : null;

    return (
        <Popover.Root open={open} onOpenChange={setOpen}>
            <Popover.Trigger asChild>
                <button
                    type="button"
                    disabled={disabled}
                    className={cn(
                        'flex h-10 w-full items-center justify-between rounded-md border border-border-default bg-surface-elevated px-3 py-2 text-sm ring-offset-background placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500/20 disabled:cursor-not-allowed disabled:opacity-50',
                        className
                    )}
                >
                    <span className="truncate">{selectedNode?.name || placeholder}</span>
                    <ChevronDown className="h-4 w-4 text-text-muted" />
                </button>
            </Popover.Trigger>
            <Popover.Portal>
                <Popover.Content
                    sideOffset={4}
                    align="start"
                    className="z-50 w-[var(--radix-popover-trigger-width)] rounded-lg border border-border-default bg-surface-elevated shadow-lg outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
                >
                    <div className="p-2">
                        <div className="relative">
                            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                            <input
                                type="text"
                                placeholder="搜索分类..."
                                className="w-full rounded-md border border-border-default bg-surface-elevated pl-8 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                            {search && (
                                <button
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
                                    onClick={() => setSearch('')}
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                        <div className="mt-2 max-h-60 overflow-y-auto">
                            {search ? (
                                filteredData && filteredData.length > 0 ? (
                                    filteredData.map(n => (
                                        <div
                                            key={n.id}
                                            className={cn(
                                                'cursor-pointer rounded-md px-2 py-1.5 text-sm hover:bg-surface-hover',
                                                value === n.id && 'bg-primary-50 text-primary-600'
                                            )}
                                            onClick={() => handleSelect(n.id)}
                                        >
                                            {n.name}
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-2 text-center text-sm text-text-muted">未找到分类</div>
                                )
                            ) : (
                                data.map(node => (
                                    <TreeItem
                                        key={node.id}
                                        node={node}
                                        level={0}
                                        selectedId={value || ''}
                                        onSelect={handleSelect}
                                        expandedIds={expandedIds}
                                        toggleExpand={toggleExpand}
                                    />
                                ))
                            )}
                        </div>
                    </div>
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    );
}