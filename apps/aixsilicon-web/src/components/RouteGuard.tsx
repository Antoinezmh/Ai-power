import { ShieldOff } from 'lucide-react';
import { usePermission } from '@/context/PermissionContext';

interface RouteGuardProps {
  /** 所需权限码，如 `button:dashboard:view` */
  code: string;
  children: React.ReactNode;
}

export default function RouteGuard({ code, children }: RouteGuardProps) {
  const { hasPermission, loading } = usePermission();

  if (loading) {
    // 权限数据加载中，显示空白避免闪烁
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
      </div>
    );
  }

  if (!hasPermission(code)) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-danger/10">
          <ShieldOff className="h-8 w-8 text-danger" />
        </div>
        <h2 className="text-lg font-semibold text-text-primary">暂无访问权限</h2>
        <p className="mt-1 text-sm text-text-secondary">
          您当前的角色无权访问此页面，请联系管理员开通权限。
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
