import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Checkbox,
} from '@aixsilicon/ui';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Permission, Role } from '../types';
import { cn } from '@aixsilicon/ui';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: Role | null;
  permissionsTree: Permission[];
  onAssign: (permissionIds: string[]) => Promise<void>;
}

function PermissionNode({
  node,
  checkedIds,
  onToggle,
  level = 0,
}: {
  node: Permission;
  checkedIds: string[];
  onToggle: (id: string, checked: boolean) => void;
  level?: number;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;
  const isChecked = checkedIds.includes(node.id);
  const isPartial = hasChildren && node.children!.some(c => checkedIds.includes(c.id)) && !node.children!.every(c => checkedIds.includes(c.id));

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-surface-hover transition-colors',
          level > 0 && 'ml-6'
        )}
      >
        {hasChildren && (
          <button onClick={() => setExpanded(!expanded)} className="p-0.5 hover:bg-surface-active rounded">
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        )}
        <Checkbox
          checked={isChecked}
          indeterminate={isPartial}
          onCheckedChange={(checked) => onToggle(node.id, !!checked)}
        />
        <span className="text-sm font-medium">{node.name}</span>
        <span className="text-xs text-text-muted ml-1">({node.code})</span>
      </div>
      {hasChildren && expanded && (
        <div>
          {node.children!.map(child => (
            <PermissionNode
              key={child.id}
              node={child}
              checkedIds={checkedIds}
              onToggle={onToggle}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function AssignPermissionsDialog({ open, onOpenChange, role, permissionsTree, onAssign }: Props) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 构建节点映射
  const nodeMap = useMemo(() => {
    const map: Record<string, Permission> = {};
    const flatten = (nodes: Permission[]) => {
      nodes.forEach(node => {
        map[node.id] = node;
        if (node.children) flatten(node.children);
      });
    };
    flatten(permissionsTree);
    return map;
  }, [permissionsTree]);

  // 获取节点及其所有子孙 ID
  const getDescendantIds = (nodeId: string): string[] => {
    const result: string[] = [];
    const collect = (id: string) => {
      const node = nodeMap[id];
      if (!node) return;
      result.push(id);
      if (node.children) {
        node.children.forEach(child => collect(child.id));
      }
    };
    collect(nodeId);
    return result;
  };

  // 切换节点（联动）
  const handleToggle = (nodeId: string, checked: boolean) => {
    const idsToUpdate = getDescendantIds(nodeId);
    setSelectedIds(prev => {
      let newIds = [...prev];
      idsToUpdate.forEach(id => {
        if (checked) {
          if (!newIds.includes(id)) newIds.push(id);
        } else {
          newIds = newIds.filter(item => item !== id);
        }
      });
      return newIds;
    });
  };

  useEffect(() => {
    if (role) {
      setSelectedIds(role.permissions || []);
    } else {
      setSelectedIds([]);
    }
  }, [role, open]);

  const handleSubmit = async () => {
    if (!role) return;
    setIsLoading(true);
    try {
      await onAssign(selectedIds);
      onOpenChange(false);
    } catch (error) {
      console.error('分配权限失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>分配权限 — {role?.name || ''}</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-text-secondary mb-4">
            勾选该角色拥有的权限，未勾选的权限将被移除。
          </p>
          <div className="border border-border-default rounded-lg p-3">
            {permissionsTree.map(node => (
              <PermissionNode
                key={node.id}
                node={node}
                checkedIds={selectedIds}
                onToggle={handleToggle}
              />
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? '保存中...' : '保存权限'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}