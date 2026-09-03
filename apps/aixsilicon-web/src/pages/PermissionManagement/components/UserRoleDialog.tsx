import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Checkbox,
} from '@aixsilicon/ui';
import { User, Role } from '@/features/permissions/api/permissionApi';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  roles: Role[];
  onSubmit: (roleIds: string[]) => void;
  isLoading?: boolean;
}

export default function UserRoleDialog({ open, onOpenChange, user, roles, onSubmit, isLoading }: Props) {
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      setSelectedRoleIds(user.roles);
    } else {
      setSelectedRoleIds([]);
    }
  }, [user, open]);

  const handleToggle = (roleId: string) => {
    setSelectedRoleIds(prev =>
      prev.includes(roleId) ? prev.filter(id => id !== roleId) : [...prev, roleId]
    );
  };

  const handleSubmit = () => {
    onSubmit(selectedRoleIds);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>分配角色 — {user?.username || ''}</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-text-secondary mb-4">选择用户拥有的角色，可多选。</p>
          <div className="space-y-2">
            {roles.length === 0 ? (
              <p className="text-text-muted text-sm">暂无角色，请先创建角色</p>
            ) : (
              roles.map(role => (
                <div key={role.id} className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedRoleIds.includes(role.id)}
                    onCheckedChange={() => handleToggle(role.id)}
                  />
                  <span className="text-sm font-medium">{role.name}</span>
                  {role.description && (
                    <span className="text-xs text-text-muted">({role.description})</span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? '保存中...' : '保存角色'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}