import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Input,
  Textarea,
  Button,
  Checkbox,
} from '@aixsilicon/ui';
import { Role } from '@/features/permissions/api/permissionApi';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: Role | null;
  onSubmit: (data: { name: string; description?: string; is_default?: boolean }) => void;
  isLoading?: boolean;
}

export default function RoleFormDialog({ open, onOpenChange, role, onSubmit, isLoading }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  useEffect(() => {
    if (role) {
      setName(role.name);
      setDescription(role.description || '');
      setIsDefault(Boolean(role.is_default));
    } else {
      setName('');
      setDescription('');
      setIsDefault(false);
    }
  }, [role, open]);

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), description: description.trim() || undefined, is_default: isDefault });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{role ? '编辑角色' : '新建角色'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="text-sm font-medium text-text-primary">角色名称 *</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="请输入角色名称"
              className="mt-1"
            />
          </div>
          <label className="flex items-start gap-3 rounded-xl border border-border-subtle p-3">
            <Checkbox
              checked={isDefault}
              disabled={Boolean(role?.is_default)}
              onCheckedChange={(checked) => setIsDefault(checked === true)}
              className="mt-0.5"
            />
            <span>
              <span className="block text-sm font-medium text-text-primary">设为新用户默认角色</span>
              <span className="mt-0.5 block text-xs leading-5 text-text-secondary">新建账号会自动获得该角色；平台同时只保留一个默认角色。</span>
            </span>
          </label>
          <div>
            <label className="text-sm font-medium text-text-primary">描述</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="请输入角色描述"
              className="mt-1"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || isLoading}>
            {isLoading ? '保存中...' : (role ? '保存' : '创建')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
