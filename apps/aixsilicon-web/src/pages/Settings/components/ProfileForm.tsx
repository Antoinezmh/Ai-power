import { useState } from 'react';
import { Input, Button, Textarea, Avatar, AvatarFallback } from '@aixsilicon/ui';
import { PermissionGuard } from '@/components/PermissionGuard';
import { useUpdateProfile } from '@/features/settings/hooks/useSettings';
import { Profile } from '@/features/settings/api/settingsApi';

export default function ProfileForm({ profile }: { profile?: Profile }) {
  const updateProfile = useUpdateProfile();
  const [nickname, setNickname] = useState(profile?.nickname || '');
  const [email, setEmail] = useState(profile?.email || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      await updateProfile.mutateAsync({ nickname, email, bio });
      alert('保存成功');
    } catch (error) {
      alert('保存失败：' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-text-primary">个人资料</h2>
        <p className="text-sm text-text-secondary">管理您的个人信息</p>
      </div>

      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarFallback className="text-2xl">{nickname.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <Button variant="secondary" size="sm">更换头像</Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-text-primary">昵称</label>
          <Input value={nickname} onChange={(e) => setNickname(e.target.value)} className="mt-1" />
        </div>
        <div>
          <label className="text-sm font-medium text-text-primary">邮箱</label>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-text-primary">个人简介</label>
        <Textarea value={bio} onChange={(e) => setBio(e.target.value)} className="mt-1" rows={4} />
      </div>

      <PermissionGuard code="button:settings:edit">
        <Button onClick={handleSubmit} disabled={isLoading || updateProfile.isPending}>
          {isLoading || updateProfile.isPending ? '保存中...' : '保存修改'}
        </Button>
      </PermissionGuard>
    </div>
  );
}