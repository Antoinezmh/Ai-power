import { useState } from 'react';
import {
  Card,
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@aixsilicon/ui';
import { Star, Heart, MoreVertical, Zap, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@aixsilicon/ui';
import { PermissionGuard } from '@/components/PermissionGuard';
import { Tool } from '@/features/tools/api/toolsApi';
import { PopConfirm } from '@aixsilicon/ui';

interface ToolCardProps {
  tool: Tool;
  isFavorite?: boolean;
  onFavorite?: (id: string) => void;
  onViewDetail?: (tool: Tool) => void;
  onUse?: (id: string) => void;
  onEdit?: (tool: Tool) => void;
  onDelete?: (id: string) => void;
}

export function ToolCard({
  tool,
  isFavorite = false,
  onFavorite,
  onViewDetail,
  onUse,
  onEdit,
  onDelete,
}: ToolCardProps) {
  const handleFavorite = () => {
    onFavorite?.(tool.id);
  };

  // 根据类型显示标签
  const getTypeBadge = () => {
    switch (tool.type) {
      case 'executable':
        return <Badge variant="warning" className="ml-2 text-xs">可执行</Badge>;
      case 'streamlit':
        return <Badge variant="info" className="ml-2 text-xs">Streamlit</Badge>;
      case 'static':
        return <Badge variant="secondary" className="ml-2 text-xs">静态</Badge>;
      case 'external':
        return <Badge variant="secondary" className="ml-2 text-xs">外部</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card
      variant="tool"
      className="group flex h-full flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
    >
      {/* 顶部色条 */}
      <div className="h-1.5 w-full bg-gradient-to-r from-primary-400 to-primary-600" />

      {/* 内容区域 */}
      <div className="flex flex-1 flex-col p-6">
        {/* 头部：图标、标签、操作按钮 */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-100 to-primary-200 text-3xl shadow-sm transition-transform duration-300 group-hover:scale-110 dark:from-primary-900/40 dark:to-primary-800/40">
              {tool.icon || '🔧'}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {tool.tags?.slice(0, 2).map((tag) => (
                <Badge key={tag} variant="default" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {tool.tags && tool.tags.length > 2 && (
                <Badge variant="default" className="text-xs">
                  +{tool.tags.length - 2}
                </Badge>
              )}
              {getTypeBadge()}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <PermissionGuard code="button:tools:manage">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit?.(tool)}>
                    <Pencil className="mr-2 h-4 w-4" /> 编辑
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <PopConfirm
                      title="删除工具"
                      description={`确定要删除「${tool.name}」吗？此操作不可恢复！`}
                      confirmText="删除"
                      onConfirm={() => onDelete?.(tool.id)}
                      placement="right"
                    >
                      <button className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm text-danger hover:bg-surface-hover">
                        <Trash2 className="mr-2 h-4 w-4" /> 删除
                      </button>
                    </PopConfirm>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </PermissionGuard>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-text-muted hover:text-danger"
              onClick={handleFavorite}
            >
              <Heart
                className={cn(
                  'h-5 w-5 transition-colors',
                  isFavorite ? 'fill-danger text-danger' : ''
                )}
              />
            </Button>
          </div>
        </div>

        {/* 标题和元信息 */}
        <div className="mt-4">
          <h3 className="text-lg font-semibold text-text-primary transition-colors group-hover:text-primary-600">
            {tool.name}
          </h3>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-text-secondary">
            <span className="flex items-center gap-1.5">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary-100 text-[8px] font-bold text-primary-600 dark:bg-primary-800 dark:text-primary-300">
                {tool.owner?.charAt(0) || 'U'}
              </span>
              {tool.owner || '未知'}
            </span>
            <span className="h-1 w-1 rounded-full bg-text-muted" />
            <span className="flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5" />
              {tool.usage_count > 1000 ? `${(tool.usage_count / 1000).toFixed(1)}k` : tool.usage_count}
            </span>
            <span className="h-1 w-1 rounded-full bg-text-muted" />
            <span className="flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
              {tool.rating?.toFixed(1) || '0.0'}
            </span>
          </div>
        </div>

        {/* 描述 */}
        <p className="mt-3 flex-1 text-sm text-text-secondary leading-relaxed line-clamp-3">
          {tool.description}
        </p>

        {/* 状态标签 */}
        {tool.status !== 'active' && (
          <Badge variant="warning" className="mt-3 self-start">
            {tool.status === 'inactive' ? '已停用' : '已弃用'}
          </Badge>
        )}

        {/* 操作按钮 */}
        <div className="mt-5 flex items-center gap-3">
          <PermissionGuard
            code="button:tools:use"
            fallback={
              <Button variant="secondary" size="default" className="flex-1" disabled>
                使用工具
              </Button>
            }
          >
            <Button
              variant="primary"
              size="default"
              className="flex-1 gap-2"
              onClick={() => onUse?.(tool.id)}
            >
              使用工具
              <span className="inline-block transition-transform group-hover:translate-x-0.5">→</span>
            </Button>
          </PermissionGuard>
          <PermissionGuard
            code="button:tools:view"
            fallback={
              <Button variant="secondary" size="default" className="px-5" disabled>
                详情
              </Button>
            }
          >
            <Button
              variant="secondary"
              size="default"
              className="px-5"
              onClick={() => onViewDetail?.(tool)}
            >
              详情
            </Button>
          </PermissionGuard>
        </div>
      </div>
    </Card>
  );
}