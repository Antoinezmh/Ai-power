import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Badge,
} from '@aixsilicon/ui';
import { User, Role } from '@/features/permissions/api/permissionApi';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: Role | null;
  users: User[];
}

export default function RoleUsersDialog({ open, onOpenChange, role, users }: Props) {
  if (!role) return null;
  const roleUsers = users.filter(u => u.roles.includes(role.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>角色「{role.name}」关联用户</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          {roleUsers.length === 0 ? (
            <p className="text-text-muted text-center">暂无用户关联此角色</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>用户名</TableHead>
                  <TableHead>邮箱</TableHead>
                  <TableHead>状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roleUsers.map(user => (
                  <TableRow key={user.id}>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={user.status === 'active' ? 'success' : 'danger'}>
                        {user.status === 'active' ? '已激活' : '已停用'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>关闭</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}