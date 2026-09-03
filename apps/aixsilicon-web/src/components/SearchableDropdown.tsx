import * as React from 'react';
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    Input,
    cn,
} from '@aixsilicon/ui';
import { ChevronDown, Search, Check } from 'lucide-react';

export interface SearchableOption<T = string> {
    value: T;
    label: string;
    sublabel?: string;
    keyword?: string;
}

interface SearchableDropdownProps<T = string> {
    value: T | '';
    onChange: (value: T) => void;
    options: SearchableOption<T>[];
    placeholder?: string;
    emptyText?: string;
    searchPlaceholder?: string;
    disabled?: boolean;
    className?: string;
    /** 命中后展示的值（通常用 options 里的 label 反向取） */
    displayValue?: string;
}

/**
 * 支持搜索的单选下拉框（基于 DropdownMenu + Input 实现）
 * options 的 label / sublabel / keyword 均参与搜索匹配（忽略大小写）。
 */
export function SearchableDropdown<T = string>({
    value,
    onChange,
    options,
    placeholder = '请选择',
    emptyText = '无匹配项',
    searchPlaceholder = '搜索...',
    disabled,
    className,
    displayValue,
}: SearchableDropdownProps<T>) {
    const [open, setOpen] = React.useState(false);
    const [query, setQuery] = React.useState('');
    const [inputRef, setInputRef] = React.useState<HTMLInputElement | null>(null);

    // 打开时重置搜索词并自动聚焦搜索框
    React.useEffect(() => {
        if (open) {
            setQuery('');
            // 延迟一帧，等 DropdownMenu 内容渲染完成后再聚焦
            requestAnimationFrame(() => inputRef?.focus());
        }
    }, [open, inputRef]);

    const matches = options.filter((o) => {
        const q = query.trim().toLowerCase();
        if (!q) return true;
        return [o.label, o.sublabel || '', o.keyword || '']
            .join(' ')
            .toLowerCase()
            .includes(q);
    });

    const selected = options.find((o) => o.value === value);

    return (
        <DropdownMenu open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQuery(''); }}>
            <DropdownMenuTrigger asChild disabled={disabled}>
                <button
                    type="button"
                    className={cn(
                        'flex h-10 w-full items-center justify-between rounded-md border border-border-default bg-surface-elevated px-3 py-2 text-sm',
                        'focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:ring-offset-2',
                        'disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200',
                        className
                    )}
                >
                    <span className={cn('truncate', !selected && 'text-text-muted')}>
                        {displayValue ?? (selected ? selected.label : placeholder)}
                    </span>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
                align="start"
                sideOffset={4}
                className="w-[320px] max-h-80 overflow-y-auto"
            >
                {/* 搜索框 */}
                <div className="p-1.5 pb-0">
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                        <Input
                            ref={(node) => setInputRef(node)}
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder={searchPlaceholder}
                            className="h-8 pl-8"
                        />
                    </div>
                </div>
                <DropdownMenuSeparator />

                {matches.length === 0 ? (
                    <div className="px-3 py-6 text-center text-sm text-text-muted">{emptyText}</div>
                ) : (
                    matches.map((o) => (
                        <DropdownMenuItem
                            key={String(o.value)}
                            onSelect={() => { onChange(o.value); setOpen(false); }}
                            className="flex items-center justify-between gap-2 cursor-pointer"
                        >
                            <span className="flex min-w-0 flex-1 flex-col">
                                <span className="truncate">{o.label}</span>
                                {o.sublabel && (
                                    <span className="truncate text-xs text-text-muted">{o.sublabel}</span>
                                )}
                            </span>
                            {o.value === value && <Check className="h-4 w-4 shrink-0 text-primary-500" />}
                        </DropdownMenuItem>
                    ))
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
