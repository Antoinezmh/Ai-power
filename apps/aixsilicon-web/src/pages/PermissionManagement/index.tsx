import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@aixsilicon/ui';
import RoleManagement from './RoleManagement';
import PermissionList from './PermissionList';
import UserManagement from './UserManagement';
import ToolGrantManagement from './ToolGrantManagement';

export default function PermissionManagement() {
  const [activeTab, setActiveTab] = useState('roles');

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">权限管理</h1>
        <p className="text-sm text-text-secondary">管理角色、权限分配和用户授权</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-4 bg-surface-subtle p-1 rounded-xl">
          <TabsTrigger
            value="roles"
            className="rounded-lg px-4 py-2 text-sm font-medium transition-all data-[state=active]:bg-primary-500 data-[state=active]:text-white data-[state=active]:shadow-md"
          >
            角色管理
          </TabsTrigger>
          <TabsTrigger
            value="permissions"
            className="rounded-lg px-4 py-2 text-sm font-medium transition-all data-[state=active]:bg-primary-500 data-[state=active]:text-white data-[state=active]:shadow-md"
          >
            权限列表
          </TabsTrigger>
          <TabsTrigger
            value="users"
            className="rounded-lg px-4 py-2 text-sm font-medium transition-all data-[state=active]:bg-primary-500 data-[state=active]:text-white data-[state=active]:shadow-md"
          >
            用户管理
          </TabsTrigger>
          <TabsTrigger
            value="toolGrants"
            className="rounded-lg px-4 py-2 text-sm font-medium transition-all data-[state=active]:bg-primary-500 data-[state=active]:text-white data-[state=active]:shadow-md"
          >
            工具授权
          </TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="mt-6">
          <RoleManagement />
        </TabsContent>
        <TabsContent value="permissions" className="mt-6">
          <PermissionList />
        </TabsContent>
        <TabsContent value="users" className="mt-6">
          <UserManagement />
        </TabsContent>
        <TabsContent value="toolGrants" className="mt-6">
          <ToolGrantManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}