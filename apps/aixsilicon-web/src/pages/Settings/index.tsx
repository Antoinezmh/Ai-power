import { useState } from 'react';
import { Card } from '@aixsilicon/ui';
import { User, Shield, Bell, Palette, Key } from 'lucide-react';
import ProfileForm from './components/ProfileForm';
import SecurityForm from './components/SecurityForm';
import NotificationForm from './components/NotificationForm';
import AppearanceForm from './components/AppearanceForm';
import ApiKeysForm from './components/ApiKeysForm';
import { useSettings } from './hooks/useSettings';

type TabKey = 'profile' | 'security' | 'notification' | 'appearance' | 'api';

const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'profile', label: '个人资料', icon: <User className="w-4 h-4" /> },
  // { key: 'security', label: '安全设置', icon: <Shield className="w-4 h-4" /> },
  { key: 'notification', label: '通知偏好', icon: <Bell className="w-4 h-4" /> },
  { key: 'appearance', label: '界面设置', icon: <Palette className="w-4 h-4" /> },
  // { key: 'api', label: 'API 密钥', icon: <Key className="w-4 h-4" /> },
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState<TabKey>('profile');
  const settings = useSettings();

  // 调试：打印当前激活的 tab
  console.log('当前激活的 tab:', activeTab);

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
                console.log('点击了 tab:', tab.key);
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
          {activeTab === 'profile' && <ProfileForm settings={settings} />}
          {activeTab === 'security' && <SecurityForm settings={settings} />}
          {activeTab === 'notification' && <NotificationForm settings={settings} />}
          {activeTab === 'appearance' && <AppearanceForm settings={settings} />}
          {activeTab === 'api' && <ApiKeysForm settings={settings} />}
        </Card>
      </div>
    </div>
  );
}