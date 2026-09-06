import { useState } from 'react';
import { Card } from '@aixsilicon/ui';
import { Bot, Key, Shield, User } from 'lucide-react';
import ProfileForm from './components/ProfileForm';
import SecurityForm from './components/SecurityForm';
import ApiKeysForm from './components/ApiKeysForm';
import AgentSettingsForm from './components/AgentSettingsForm';
import { useProfile } from '@/features/settings/hooks/useSettings';

type TabKey = 'profile' | 'security' | 'api' | 'agent';

const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'profile', label: '个人资料', icon: <User className="w-4 h-4" /> },
  { key: 'security', label: '安全设置', icon: <Shield className="w-4 h-4" /> },
  { key: 'api', label: 'API 密钥', icon: <Key className="w-4 h-4" /> },
  { key: 'agent', label: '智能体设置', icon: <Bot className="w-4 h-4" /> },
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState<TabKey>('profile');
  const { data: profile, isLoading: profileLoading, error: profileError } = useProfile();

  return (
    <div className="flex h-full gap-6">
      {/* 左侧导航 */}
      <div className="w-56 shrink-0">
        <div className="sticky top-6 rounded-xl border border-border-default bg-surface-elevated p-2">
          {tabs.map(tab => (
            <div
              key={tab.key}
              className={`flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${activeTab === tab.key
                ? 'bg-primary-50 text-primary-600 dark:bg-primary-950/30 before:absolute before:left-0 before:top-1/2 before:h-6 before:w-1 before:-translate-y-1/2 before:rounded-r before:bg-primary-600 dark:before:bg-primary-400'
                : 'text-text-secondary hover:bg-surface-hover'
                } relative`}
              onClick={() => {
                setActiveTab(tab.key);
              }}
            >
              {tab.icon}
              {tab.label}
            </div>
          ))}
        </div>
      </div>

      {/* 右侧内容 */}
      <div className="flex-1 min-w-0">
        <Card className="p-6">
          {activeTab === 'profile' && (profileLoading
            ? <div className="py-10 text-center text-text-muted">正在加载个人资料…</div>
            : profileError
              ? <div className="py-10 text-center text-danger">个人资料加载失败：{(profileError as Error).message}</div>
              : <ProfileForm profile={profile} />)}
          {activeTab === 'security' && <SecurityForm />}
          {activeTab === 'api' && <ApiKeysForm />}
          {activeTab === 'agent' && <AgentSettingsForm />}
        </Card>
      </div>
    </div>
  );
}
