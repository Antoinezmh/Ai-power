import { Switch } from '@aixsilicon/ui';

export default function NotificationForm({ settings }: { settings: any }) {
  const { notification, updateNotification } = settings;

  const handleToggle = (key: keyof typeof notification) => async (checked: boolean) => {
    await updateNotification({ [key]: checked });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-text-primary">通知偏好</h2>
        <p className="text-sm text-text-secondary">管理您接收通知的方式</p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between py-2 border-b border-border-subtle">
          <div>
            <p className="font-medium text-text-primary">邮件通知</p>
            <p className="text-sm text-text-secondary">接收系统邮件提醒</p>
          </div>
          <Switch checked={notification.emailNotifications} onCheckedChange={handleToggle('emailNotifications')} />
        </div>
        <div className="flex items-center justify-between py-2 border-b border-border-subtle">
          <div>
            <p className="font-medium text-text-primary">系统通知</p>
            <p className="text-sm text-text-secondary">应用内系统消息</p>
          </div>
          <Switch checked={notification.systemNotifications} onCheckedChange={handleToggle('systemNotifications')} />
        </div>
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="font-medium text-text-primary">消息提醒</p>
            <p className="text-sm text-text-secondary">来自其他用户的消息</p>
          </div>
          <Switch checked={notification.messageReminders} onCheckedChange={handleToggle('messageReminders')} />
        </div>
      </div>
    </div>
  );
}