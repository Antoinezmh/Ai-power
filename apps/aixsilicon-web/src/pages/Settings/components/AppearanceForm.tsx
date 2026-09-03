import { Switch } from '@aixsilicon/ui';
import { cn } from '@aixsilicon/ui';
import { useTheme } from '../../../providers/ThemeProvider';

export default function AppearanceForm({ settings }: { settings: any }) {
  const { appearance, updateAppearance } = settings;
  const { setTheme } = useTheme();

  const themes = [
    { value: 'light', label: '浅色', bg: 'bg-white', text: 'text-black' },
    { value: 'dark', label: '深色', bg: 'bg-zinc-900', text: 'text-white' },
    { value: 'system', label: '跟随系统', bg: 'bg-gradient-to-r from-white to-zinc-900', text: 'text-black dark:text-white' },
  ];

  const handleThemeChange = async (theme: 'light' | 'dark' | 'system') => {
    await updateAppearance({ theme });
    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      setTheme(systemTheme);
    } else {
      setTheme(theme);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-text-primary">界面设置</h2>
        <p className="text-sm text-text-secondary">自定义主题和交互行为</p>
      </div>

      <div>
        <p className="font-medium text-text-primary mb-3">主题模式</p>
        <div className="grid grid-cols-3 gap-4">
          {themes.map(t => (
            <div
              key={t.value}
              className={cn(
                'cursor-pointer rounded-xl border-2 p-4 text-center transition-all',
                appearance.theme === t.value ? 'border-primary-500 ring-2 ring-primary-500/20' : 'border-border-default hover:border-border-hover'
              )}
              onClick={() => handleThemeChange(t.value as any)}
            >
              <div className={cn('h-16 rounded-lg', t.bg, t.text)} />
              <p className="mt-2 text-sm font-medium">{t.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-border-default pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-text-primary">默认折叠侧边栏</p>
            <p className="text-sm text-text-secondary">启动后侧边栏默认收起</p>
          </div>
          <Switch
            checked={appearance.sidebarCollapsed}
            onCheckedChange={async (checked) => {
              await updateAppearance({ sidebarCollapsed: checked });
            }}
          />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-text-primary">减少动画效果</p>
            <p className="text-sm text-text-secondary">降低动画强度，提高性能</p>
          </div>
          <Switch
            checked={appearance.reduceAnimations}
            onCheckedChange={async (checked) => {
              await updateAppearance({ reduceAnimations: checked });
            }}
          />
        </div>
      </div>
    </div>
  );
}