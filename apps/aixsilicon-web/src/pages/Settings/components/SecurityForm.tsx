import { useState } from 'react';
import { Input, Button, Switch } from '@aixsilicon/ui';
import { PermissionGuard } from '@/components/PermissionGuard';
import { useChangePassword } from '@/features/settings/hooks/useSettings';

export default function SecurityForm() {
  const changePassword = useChangePassword();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [twoFactor, setTwoFactor] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handlePasswordChange = async () => {
    if (!oldPassword || !newPassword) return alert('请填写完整');
    setIsLoading(true);
    try {
      await changePassword.mutateAsync({ oldPassword, newPassword });
      setOldPassword('');
      setNewPassword('');
      alert('密码修改成功');
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
        </div>
        <PermissionGuard code="button:settings:edit">
          <Button onClick={handlePasswordChange} disabled={isLoading || changePassword.isPending}>
            {isLoading || changePassword.isPending ? '修改中...' : '修改密码'}
          </Button>
        </PermissionGuard>
      </div>

      <div className="border-t border-border-default pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-text-primary">两步验证</p>
            <p className="text-sm text-text-secondary">开启后登录需要输入动态验证码</p>
          </div>
          <Switch checked={twoFactor} onCheckedChange={setTwoFactor} />
        </div>
      </div>
    </div>
  );
}