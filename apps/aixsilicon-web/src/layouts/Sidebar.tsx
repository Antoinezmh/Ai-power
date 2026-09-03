import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Store,
  Shield,
  Settings,
  ChevronLeft,
  ChevronRight,
  FolderTree,
  FolderOpen,
  type LucideIcon
} from 'lucide-react';
import { Button, cn } from '@aixsilicon/ui';
import { useSidebarStore } from '../stores/sidebarStore';
import { usePermission } from '@/context/PermissionContext';
import { useAuthStore } from '@/features/auth/stores/authStore';

// 基于 role ID 的菜单权限预映射（同步检查，无需等待 API）
// role1 = 超级管理员, role2 = 普通用户, role3 = 工具管理员
const ROLE_MENU_PERMISSIONS: Record<string, string[]> = {
  role1: ['menu:dashboard', 'menu:files', 'menu:tools', 'menu:chat', 'menu:permissions', 'menu:settings', 'menu:categories'],
  role2: ['menu:dashboard', 'menu:files', 'menu:tools', 'menu:chat', 'menu:settings', 'menu:categories'],
  role3: ['menu:tools', 'menu:permissions', 'menu:settings', 'menu:categories'],
};

interface MenuItem {
  path: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
  permission?: string;
}

const allMenuItems: MenuItem[] = [
  { path: '/dashboard', label: '仪表盘', icon: LayoutDashboard, permission: 'menu:dashboard' },
  { path: '/files', label: '文件中心', icon: FolderOpen, permission: 'menu:files' },
  { path: '/tools', label: '工具市场', icon: Store, permission: 'menu:tools' },
  // { path: '/chat', label: 'AI对话', icon: MessageSquare, badge: 'New', permission: 'menu:chat' },
  { path: '/permissions', label: '权限管理', icon: Shield, permission: 'menu:permissions' },
  { path: '/settings', label: '个人设置', icon: Settings, permission: 'menu:settings' },
  { path: '/categories', label: '分类设置', icon: FolderTree, permission: 'menu:categories' },
];

export default function Sidebar() {
  const { collapsed, toggle } = useSidebarStore();
  const { hasPermission, loading } = usePermission();
  const { user } = useAuthStore();

  // 基于 authStore 的 role IDs 做同步预检查，不依赖 PermissionContext 的异步加载
  // 这样可以避免 loading 期间闪现所有 tab 的问题
  const userMenuPermissions = user?.roles?.flatMap(roleId => ROLE_MENU_PERMISSIONS[roleId] || []) || [];

  const menuItems = allMenuItems.filter(item => {
    // 无 permission 字段的菜单项为公共菜单，始终显示
    if (!item.permission) return true;
    // 如果 PermissionContext 已完成加载，使用异步检查结果
    if (!loading && hasPermission) {
      return hasPermission(item.permission);
    }
    // 加载期间使用同步预检查（基于 authStore 的 role IDs）
    return userMenuPermissions.includes(item.permission);
  });

  // 如果菜单为空（无权限且加载完成），显示一个提示（可选）
  if (!loading && menuItems.length === 0) {
    return (
      <aside className={cn(
        'flex h-screen flex-col border-r border-gray-200 bg-white transition-all duration-300',
        collapsed ? 'w-[72px]' : 'w-64'
      )}>
        <div className="flex h-16 items-center border-b border-gray-200 px-4">
          {!collapsed ? (
            <span className="text-xl font-bold text-gray-900">AI DevHub</span>
          ) : (
            <span className="mx-auto text-xl font-bold text-primary-600">AI</span>
          )}
        </div>
        <div className="flex-1 p-4 text-center text-gray-500 text-sm">
          暂无权限，请联系管理员
        </div>
        <div className="border-t border-gray-200 p-4">
          <Button variant="ghost" size="icon" onClick={toggle} className="w-full justify-center text-gray-500 hover:bg-gray-100">
            {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </Button>
        </div>
      </aside>
    );
  }

  return (
    // 强制深色：添加 dark 类，并使用固定深色背景、文字、边框
    <aside
      className={cn(
        'flex h-screen flex-col border-r border-gray-200 bg-white transition-all duration-300',
        collapsed ? 'w-[72px]' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-gray-200 px-4">
        {!collapsed ? (
          <span className="text-xl font-bold text-gray-900">AI DevHub</span>
        ) : (
          <span className="mx-auto text-xl font-bold text-primary-600">AI</span>
        )}
      </div>

      {/* 菜单 */}
      <nav className="flex-1 space-y-1 p-2">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors duration-200',
                isActive
                  ? 'bg-primary-50 text-primary-600 before:absolute before:left-0 before:top-1/2 before:h-6 before:w-1 before:-translate-y-1/2 before:rounded-r before:bg-primary-600'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                collapsed ? 'relative justify-center px-0' : 'relative'
              )
            }
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1 truncate">{item.label}</span>
                {item.badge && (
                  <span className="rounded bg-primary-500 px-1.5 py-0.5 text-xs font-medium text-white">
                    {item.badge}
                  </span>
                )}
              </>
            )}
            {collapsed && (
              <div className="absolute left-full ml-2 hidden whitespace-nowrap rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-lg hover:bg-gray-50 group-hover:block">
                {item.label}
                {item.badge && <span className="ml-1 text-primary-600">({item.badge})</span>}
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* 折叠按钮 */}
      <div className="border-t border-gray-200 p-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggle}
          className="w-full justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-700"
        >
          {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </Button>
      </div>
    </aside>
  );
}