import { useState, useEffect, useCallback } from 'react';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, message } from '@aixsilicon/ui';
import { FileText } from 'lucide-react';
import type { FileAsset } from './api/fileApi';

export interface FilePickerModalOptions {
    group?: string;
    func?: string;
    ns?: string;
    multi?: boolean;
    title?: string;
}

/**
 * 文件选择器弹窗（可复用于各工具模块）。
 * 内部以 iframe 加载独立 FilePicker 页面，接收 postMessage 回报选中文件。
 */
export function FilePickerModal({
    open,
    onOpenChange,
    onSelect,
    options,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelect: (files: FileAsset[]) => void;
    options?: FilePickerModalOptions;
}) {
    const [loading, setLoading] = useState(false);

    const params = new URLSearchParams();
    if (options?.group) params.set('group', options.group);
    if (options?.func) params.set('func', options.func);
    if (options?.ns) params.set('ns', options.ns);
    if (options?.multi === false) params.set('multi', 'false');
    if (options?.title) params.set('title', options.title);
    const query = params.toString();
    const src = `/files/picker${query ? `?${query}` : ''}`;

    const handleMessage = useCallback((event: MessageEvent) => {
        if (!event.data || typeof event.data !== 'object') return;
        if (event.data.type === 'FILE_PICKER_RESULT') {
            const files: FileAsset[] = event.data.files || [];
            onSelect(files);
            onOpenChange(false);
            if (files.length > 0) {
                message.success(`已选择 ${files.length} 个文件`);
            }
        } else if (event.data.type === 'FILE_PICKER_CANCEL') {
            onOpenChange(false);
        }
    }, [onSelect, onOpenChange]);

    useEffect(() => {
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [handleMessage]);

    useEffect(() => {
        setLoading(open);
    }, [open]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex max-h-[85vh] max-w-4xl flex-col p-0">
                <DialogHeader className="px-4 pt-4">
                    <DialogTitle className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        文件选择器
                    </DialogTitle>
                </DialogHeader>
                <div className="relative h-[60vh] flex-1 overflow-hidden">
                    <iframe
                        src={src}
                        title="文件选择器"
                        className="h-full w-full border-0"
                        onLoad={() => setLoading(false)}
                        allow=""
                    />
                    {loading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-surface/70 text-sm text-text-secondary">
                            加载中...
                        </div>
                    )}
                </div>
                <div className="flex justify-end gap-2 px-4 py-3">
                    <Button variant="secondary" onClick={() => onOpenChange(false)}>取消</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
