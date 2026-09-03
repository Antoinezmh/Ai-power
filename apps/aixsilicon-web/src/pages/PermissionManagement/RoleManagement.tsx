import { useState } from 'react';
import {
  Card,
  CardContent,
  Button,
  Input,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Badge,

} from '@aixsilicon/ui';
import { message, PopConfirm } from '@aixsilicon/ui';
import { Plus, Pencil, Trash2, Shield, Users } from 'lucide-react';
import {
  useRoles,
  useDeleteRole,
  useCreateRole,
  useUpdateRole,
  usePermissionsTree,
} from '@/features/permissions/hooks/usePermissions';
import RoleFormDialog from './components/RoleFormDialog';
import AssignPermissionsDialog from './components/AssignPermissionsDialog';
import RoleUsersDialog from './components/RoleUsersDialog';
import { useUsers } from '@/features/permissions/hooks/usePermissions';
import { Role } from '@/features/permissions/api/permissionApi';
// 导入 useAssignPermissions
import { useAssignPermissions } from '@/features/permissions/hooks/usePermissions';
export default function RoleManagement() {
  const { data: roles = [], isLoading, refetch } = useRoles();
  const { data: users = [] } = useUsers();
  const { data: permissionsTree = [] } = usePermissionsTree();
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const deleteRole = useDeleteRole();

  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isUsersDialogOpen, setIsUsersDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const assignPermissions = useAssignPermissions();
  const filteredRoles = roles.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.description?.toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (role: Role) => {
    setEditingRole(role);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteRole.mutateAsync(id);
      message.success('角色已删除');
      refetch();
    } catch (error) {
      message.error('删除失败：' + (error as Error).message);
    }
  };

  const handleAssign = (role: Role) => {
    setSelectedRole(role);
    setIsAssignOpen(true);
  };

  const handleFormSubmit = async (data: any) => {
    if (editingRole) {
      await updateRole.mutateAsync({ id: editingRole.id, data });
      message.success('角色已更新');
    } else {
      await createRole.mutateAsync(data);
      message.success('新角色已创建');
    }
    setIsFormOpen(false);
    refetch();
  };
  const handleAssignSubmit = async (permissionIds: string[]) => {
    if (!selectedRole) return;
    try {
      await assignPermissions.mutateAsync({ roleId: selectedRole.id, permissionIds });
      message.success('权限已更新');
      setIsAssignOpen(false);
      refetch();
    } catch (error) {
      message.error('分配权限失败：' + (error as Error).message);
    }
  };
  if (isLoading) return <div className="p-8 text-center text-text-secondary">加载中...</div>;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Input
                placeholder="搜索角色..."
                className="w-64"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Badge variant="secondary">{roles.length} 个角色</Badge>
            </div>
            <Button onClick={() => { setEditingRole(null); setIsFormOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" /> 新建角色
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>角色名称</TableHead>
                <TableHead>描述</TableHead>
                <TableHead>默认角色</TableHead>
                <TableHead>关联用户</TableHead>
                <TableHead>权限数量</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRoles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-text-muted py-8">
                    暂无角色
                  </TableCell>
                </TableRow>
              ) : (
                filteredRoles.map((role) => {
                  // ✅ 核心修复：直接使用 users 实时计算关联用户数，忽略后端 user_count
                  const userCount = users.filter(u => u.roles.includes(role.id)).length;

                  return (
                    <TableRow key={role.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-primary-600" />
                          {role.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-text-secondary">{role.description || '-'}</TableCell>
                      <TableCell>
                        {role.is_default ? <Badge variant="success">是</Badge> : <Badge variant="secondary">否</Badge>}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => { setSelectedRole(role); setIsUsersDialogOpen(true); }}
                        >
                          <Users className="mr-1 h-3 w-3" />
                          {userCount} 人
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Badge variant="primary">{role.permissions?.length || 0}</Badge>
                      </TableCell>
                      <TableCell className="text-text-secondary">
                        {role.created_at ? new Date(role.created_at).toLocaleString('zh-CN') : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAssign(role)}
                            className="h-8 px-2"
                          >
                            分配权限
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEdit(role)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <PopConfirm
                            title="删除工具"
                            description={`确定要删除此角色吗？此操作不可恢复！`}
                            confirmText="删除"
                            onConfirm={() => handleDelete?.(role.id)}
                            placement="right"
                          >
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-danger hover:text-danger"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </PopConfirm>

                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <RoleFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        role={editingRole}
        onSubmit={handleFormSubmit}
        isLoading={createRole.isPending || updateRole.isPending}
      />

      <AssignPermissionsDialog
        open={isAssignOpen}
        onOpenChange={setIsAssignOpen}
        role={selectedRole}
        permissionsTree={permissionsTree}
        onAssign={handleAssignSubmit}   // ✅ 传递函数
      />

      <RoleUsersDialog
        open={isUsersDialogOpen}
        onOpenChange={setIsUsersDialogOpen}
        role={selectedRole}
        users={users}
        onUserCountChange={() => {
          // 当用户角色关系变化时，刷新角色列表和用户列表
          refetch();
        }}
      />
    </div>
  );
}