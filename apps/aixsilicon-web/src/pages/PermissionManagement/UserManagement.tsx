import { useState } from 'react';
import {
  Card,
  CardContent,
  Input,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Badge,
  Button,
  Switch,
} from '@aixsilicon/ui';
import { Shield, Plus } from 'lucide-react';
import { useUsers, useRoles, useAssignUserRoles, useCreateUser, useUpdateUser } from '@/features/permissions/hooks/usePermissions';
import UserRoleDialog from './components/UserRoleDialog';
import UserCreateDialog from './components/UserCreateDialog';
import { User } from '@/features/permissions/api/permissionApi';
import { message } from '@aixsilicon/ui';

export default function UserManagement() {
  const { data: users = [], isLoading: usersLoading, refetch: refetchUsers } = useUsers();
  const { data: roles = [] } = useRoles();
  const assignUserRoles = useAssignUserRoles();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();

  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  // 状态切换（添加消息提示）
  const handleToggleStatus = async (user: User) => {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    try {
      await updateUser.mutateAsync({ id: user.id, data: { status: newStatus } });
      message.success(`用户「${user.username}」已${newStatus === 'active' ? '激活' : '停用'}`);
      refetchUsers();
    } catch (error) {
      message.error('操作失败：' + (error as Error).message);
    }
  };

  if (usersLoading) {
    return <div className="p-8 text-center text-text-secondary">加载中...</div>;
  }

  return (
    <>
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Input
                placeholder="搜索用户..."
                className="w-64"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Badge variant="secondary">{users.length} 个用户</Badge>
            </div>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> 新增用户
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>用户</TableHead>
                <TableHead>邮箱</TableHead>
                <TableHead>角色</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>注册时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-text-muted py-8">
                    暂无用户
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-400 flex items-center justify-center text-xs font-bold">
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium">{user.username}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-text-secondary">{user.email}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.roles.length === 0 ? (
                          <span className="text-text-muted text-sm">未分配</span>
                        ) : (
                          user.roles.map(roleId => {
                            const role = roles.find(r => r.id === roleId);
                            return role ? (
                              <Badge key={roleId} variant="primary" className="text-xs">
                                {role.name}
                              </Badge>
                            ) : null;
                          })
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={user.status === 'active'}
                          onCheckedChange={() => handleToggleStatus(user)}
                        />
                        <span className="text-sm text-text-secondary">
                          {user.status === 'active' ? '已激活' : '已停用'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-text-secondary">
                      {new Date(user.created_at).toLocaleString('zh-CN')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setSelectedUser(user); setIsRoleDialogOpen(true); }}
                          className="h-8 px-3"
                        >
                          <Shield className="mr-1 h-4 w-4" /> 分配角色
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 新增用户弹窗 */}
      <UserCreateDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={async (data) => {
          try {
            await createUser.mutateAsync(data);
            message.success(`用户「${data.username}」创建成功`);
            refetchUsers();
            setIsCreateDialogOpen(false);
          } catch (error) {
            message.error('创建用户失败：' + (error as Error).message);
          }
        }}
        isLoading={createUser.isPending}
      />

      {/* 分配角色弹窗 */}
      <UserRoleDialog
        open={isRoleDialogOpen}
        onOpenChange={setIsRoleDialogOpen}
        user={selectedUser}
        roles={roles}
        onSubmit={async (roleIds) => {
          if (selectedUser) {
            try {
              await assignUserRoles.mutateAsync({ userId: selectedUser.id, roleIds });
              message.success(`用户「${selectedUser.username}」角色已更新`);
              refetchUsers();
              setIsRoleDialogOpen(false);
            } catch (error) {
              message.error('分配角色失败：' + (error as Error).message);
            }
          }
        }}
        isLoading={assignUserRoles.isPending}
      />
    </>
  );
}