import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, Badge, Button } from '@aixsilicon/ui';
import { Zap, Star, User, Calendar, Tag } from 'lucide-react';
import { Tool } from '@/features/tools/api/toolsApi';

interface ToolDetailDrawerProps {
    tool: Tool | null;
    open: boolean;
    onClose: () => void;
}

export function ToolDetailDrawer({ tool, open, onClose }: ToolDetailDrawerProps) {
    if (!tool) return null;

    return (
        <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3">
                        <span className="text-3xl">{tool.icon}</span>
                        {tool.name}
                    </DialogTitle>
                    <DialogDescription className="flex items-center gap-4 text-sm text-text-secondary">
                        <span className="flex items-center gap-1">
                            <User className="h-4 w-4" /> {tool.owner}
                        </span>
                        <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" /> {tool.created_at}
                        </span>
                        <span className="flex items-center gap-1">
                            <Zap className="h-4 w-4" /> {tool.usage_count} 次调用
                        </span>
                        <span className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" /> {(tool.rating ?? 0).toFixed(1)}
                        </span>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div>
                        <h4 className="text-sm font-medium text-text-secondary">详细描述</h4>
                        <p className="mt-1 text-base text-text-primary leading-relaxed">
                            {tool.description}
                        </p>
                    </div>

                    <div>
                        <h4 className="text-sm font-medium text-text-secondary">标签</h4>
                        <div className="mt-2 flex flex-wrap gap-2">
                            {tool.tags.map((tag) => (
                                <Badge key={tag} variant="primary">
                                    <Tag className="mr-1 h-3 w-3" /> {tag}
                                </Badge>
                            ))}
                        </div>
                    </div>

                    {/* <div className="rounded-lg bg-surface-subtle p-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-text-secondary">当前状态</span>
                            <Badge
                                variant={
                                    tool.status === 'active'
                                        ? 'success'
                                        : tool.status === 'inactive'
                                            ? 'warning'
                                            : 'danger'
                                }
                            >
                                {tool.status === 'active' ? '正常' : tool.status === 'inactive' ? '已停用' : '已弃用'}
                            </Badge>
                        </div>
                    </div> */}

                    <div className="flex justify-end gap-3 pt-4">
                        <Button variant="secondary" onClick={onClose}>
                            关闭
                        </Button>
                        <Button variant="primary" className="gap-2">
                            使用工具 →
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}