import { useMemo, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Bot,
  ChevronDown,
  FolderOpen,
  FolderTree,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Settings,
  Shield,
  Sparkles,
  Store,
  Sun,
  User,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Button, cn } from '@aixsilicon/ui';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@aixsilicon/ui';
import { useTheme } from '@/providers/ThemeProvider';
import { usePermission } from '@/context/PermissionContext';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { useUserStore } from '@/features/auth/stores/userStore';
import { authApi } from '@/features/auth/api/authApi';

type NavItem = { path: string; label: string; icon: LucideIcon; permission: string };

const primaryNav: NavItem[] = [
  { path: '/dashboard', label: '工作台', icon: LayoutDashboard, permission: 'menu:dashboard' },
  { path: '/chat', label: 'AI 助手', icon: Bot, permission: 'menu:chat' },
  { path: '/tools', label: '工具', icon: Store, permission: 'menu:tools' },
  { path: '/files', label: '资料', icon: FolderOpen, permission: 'menu:files' },
];

const managementNav: NavItem[] = [
  { path: '/permissions', label: '权限管理', icon: Shield, permission: 'menu:permissions' },
  { path: '/categories', label: '分类设置', icon: FolderTree, permission: 'menu:categories' },
];

export default function Header() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { hasPermission, loading } = usePermission();
  const { user, clearAuth } = useAuthStore();
  const clearUser = useUserStore((state) => state.clearUser);
  const [menuOpen, setMenuOpen] = useState(false);

  const allowed = useMemo(() => {
    return (code: string) => {
      if (user?.is_superuser) return true;
      return !loading && hasPermission(code);
    };
  }, [hasPermission, loading, user?.is_superuser]);

  const visiblePrimary = primaryNav.filter((item) => allowed(item.permission));
  const visibleManagement = managementNav.filter((item) => allowed(item.permission));
  const displayName = user?.full_name || user?.username || '用户';

  const handleLogout = async () => {
    try { await authApi.logout(); } catch { /* local cleanup remains authoritative */ }
    clearAuth(); clearUser(); navigate('/login', { replace: true });
  };
  const closeMenu = () => setMenuOpen(false);

  return <header className="sticky top-0 z-40 border-b border-border-subtle bg-surface-elevated/85 backdrop-blur-xl">
    <div className="mx-auto flex h-[72px] max-w-[1440px] items-center gap-4 px-4 sm:px-6">
      <NavLink to="/dashboard" className="flex shrink-0 items-center gap-2.5" onClick={closeMenu}>
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#111827] text-xs font-semibold tracking-tight text-white">AP</span>
        <span className="hidden text-sm font-semibold tracking-[0.12em] text-text-primary sm:block">AI POWER</span>
      </NavLink>

      <nav className="hidden items-center gap-1 md:flex">
        {visiblePrimary.map((item) => <HeaderLink key={item.path} item={item} />)}
      </nav>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        {visibleManagement.length > 0 && <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="hidden rounded-full px-3 text-text-secondary hover:text-text-primary sm:inline-flex">管理 <ChevronDown className="ml-1 h-3.5 w-3.5" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-44">{visibleManagement.map((item) => <DropdownMenuItem key={item.path} className="gap-2" onClick={() => navigate(item.path)}><item.icon className="h-4 w-4" />{item.label}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu>}
        <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="切换主题" className="rounded-full text-text-secondary"><span className="sr-only">切换主题</span>{theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</Button>
        <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-9 w-9 rounded-full border border-border-default bg-surface-elevated"><User className="h-4 w-4 text-text-secondary" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-52"><div className="px-2 py-2"><p className="truncate text-sm font-medium text-text-primary">{displayName}</p><p className="truncate text-xs text-text-tertiary">{user?.email || '部门账号'}</p></div><DropdownMenuSeparator /><DropdownMenuItem className="gap-2" onClick={() => navigate('/settings')}><Settings className="h-4 w-4" />个人设置</DropdownMenuItem>{visibleManagement.map((item) => <DropdownMenuItem key={`profile-${item.path}`} className="gap-2 sm:hidden" onClick={() => navigate(item.path)}><item.icon className="h-4 w-4" />{item.label}</DropdownMenuItem>)}<DropdownMenuSeparator /><DropdownMenuItem className="gap-2 text-danger" onClick={handleLogout}><LogOut className="h-4 w-4" />退出登录</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
        <Button variant="ghost" size="icon" onClick={() => setMenuOpen((open) => !open)} aria-label="打开导航" className="rounded-full md:hidden">{menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</Button>
      </div>
    </div>

    {menuOpen && <div className="border-t border-border-subtle bg-surface-elevated px-4 py-4 shadow-lg md:hidden"><nav className="mx-auto grid max-w-[1440px] gap-1">{visiblePrimary.map((item) => <MobileLink key={item.path} item={item} onClick={closeMenu} />)}{visibleManagement.length > 0 && <p className="mb-1 mt-4 px-3 text-xs font-semibold tracking-[0.14em] text-text-tertiary">管理</p>}{visibleManagement.map((item) => <MobileLink key={item.path} item={item} onClick={closeMenu} />)}</nav></div>}
  </header>;
}

function HeaderLink({ item }: { item: NavItem }) {
  return <NavLink to={item.path} className={({ isActive }) => cn('rounded-full px-3.5 py-2 text-sm font-medium transition-colors', isActive ? 'bg-surface-subtle text-text-primary' : 'text-text-secondary hover:bg-surface-subtle hover:text-text-primary')}>{item.label}</NavLink>;
}

function MobileLink({ item, onClick }: { item: NavItem; onClick: () => void }) {
  return <NavLink to={item.path} onClick={onClick} className={({ isActive }) => cn('flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium', isActive ? 'bg-primary-50 text-primary-700 dark:bg-primary-950/30 dark:text-primary-300' : 'text-text-secondary hover:bg-surface-subtle')}><item.icon className="h-4 w-4" />{item.label}{item.path === '/chat' && <Sparkles className="ml-auto h-3.5 w-3.5 text-primary-500" />}</NavLink>;
}
