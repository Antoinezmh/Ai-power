import React from 'react';
import { usePermission } from '@/context/PermissionContext';

interface PermissionGuardProps {
  code: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({ code, fallback = null, children }) => {
  const { hasPermission, loading } = usePermission();

  if (loading) {
    return <>{children}</>; // 或返回 null，但为了不闪烁直接显示 children
  }

  return hasPermission(code) ? <>{children}</> : <>{fallback}</>;
};