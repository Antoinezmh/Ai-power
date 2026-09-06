import { useState } from 'react';
import { Input, Button } from '@aixsilicon/ui';
import { PermissionGuard } from '@/components/PermissionGuard';
import { useChangePassword } from '@/features/settings/hooks/useSettings';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { useNavigate } from 'react-router-dom';

export default function SecurityForm() {
  const changePassword = useChangePassword();
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const navigate = useNavigate();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handlePasswordChange = async () => {
    if (!oldPassword || !newPassword) return alert('请填写完整');
    setIsLoading(true);
    try {
      await changePassword.mutateAsync({ oldPassword, newPassword });
      setOldPassword('');
      setNewPassword('');
      alert('密码修改成功，请使用新密码重新登录');
      clearAuth();
      navigate('/login', { replace: true });
    } catch (error) {
      alert('修改失败：' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-text-primary">安全设置</h2>
        <p className="text-sm text-text-secondary">修改密码和账户安全</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-text-primary">当前密码</label>
          <Input
            type="password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-text-primary">新密码</label>
          <Input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="mt-1"
          />
          <p className="mt-1 text-xs text-text-muted">至少 12 个字符</p>
        </div>
        <PermissionGuard code="button:settings:edit">
          <Button onClick={handlePasswordChange} disabled={isLoading || changePassword.isPending}>
            {isLoading || changePassword.isPending ? '修改中...' : '修改密码'}
          </Button>
        </PermissionGuard>
      </div>
    </div>
  );
}
