import { useEffect, useState } from 'react';
import { Check, KeyRound, Loader2, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '@aixsilicon/ui';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { chatApi, type AgentConfig } from '@/features/chat/api/chatApi';

const emptyConfig: AgentConfig = {
  provider: 'openai-compatible',
  model: 'gpt-4o-mini',
  base_url: 'https://api.openai.com/v1',
  enabled: false,
  key_configured: false,
};

export default function AgentSettingsForm() {
  const user = useAuthStore((state) => state.user);
  const isPlatformAdmin = Boolean(user?.is_superuser || user?.permissions.includes('button:chat:configure'));
  const [personal, setPersonal] = useState<AgentConfig | null>(null);
  const [platform, setPlatform] = useState<AgentConfig | null>(null);
  const [personalKey, setPersonalKey] = useState('');
  const [platformKey, setPlatformKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<'personal' | 'platform' | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const personalConfig = await chatApi.getPersonalConfig();
        const platformConfig = isPlatformAdmin ? await chatApi.getConfig() : null;
        if (!active) return;
        setPersonal(personalConfig);
        setPlatform(platformConfig);
      } catch (requestError) {
        if (active) setError(requestError instanceof Error ? requestError.message : '无法读取 Agent 设置');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [isPlatformAdmin]);

  const save = async (scope: 'personal' | 'platform') => {
    const config = scope === 'personal' ? personal : platform;
    const key = scope === 'personal' ? personalKey : platformKey;
    if (!config) return;
    setSaving(scope);
    setError('');
    setNotice('');
    try {
      const data = {
        provider: config.provider,
        model: config.model,
        base_url: config.base_url,
        enabled: config.enabled,
        ...(key ? { api_key: key } : {}),
      };
      const saved = scope === 'personal' ? await chatApi.savePersonalConfig(data) : await chatApi.saveConfig(data);
      if (scope === 'personal') {
        setPersonal(saved);
        setPersonalKey('');
      } else {
        setPlatform(saved);
        setPlatformKey('');
      }
      setNotice(scope === 'personal' ? '个人 Agent 设置已保存。' : '平台通用 Agent 设置已保存。');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '保存失败');
    } finally {
      setSaving(null);
    }
  };

  if (loading) return <div className="flex min-h-72 items-center justify-center gap-2 text-sm text-text-secondary"><Loader2 className="h-4 w-4 animate-spin" />正在读取 Agent 设置…</div>;

  return <div className="mx-auto max-w-4xl space-y-6">
    <div>
      <p className="text-xs font-semibold tracking-[0.16em] text-primary-600">AI AGENT SETTINGS</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-text-primary">智能体设置</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">个人 Key 与平台通用 Key 完全隔离。启用个人 Key 后，仅你的对话会优先使用它；否则自动回退到平台模型。</p>
    </div>

    {error && <p className="rounded-xl bg-danger-bg px-4 py-3 text-sm text-danger">{error}</p>}
    {notice && <p className="rounded-xl bg-primary-50 px-4 py-3 text-sm text-primary-700 dark:bg-primary-950/30 dark:text-primary-300">{notice}</p>}

    <ConfigCard
      icon={<KeyRound className="h-5 w-5" />}
      eyebrow="PERSONAL CONNECTION"
      title="个人模型连接"
      description="只属于当前账号，适合使用你自己的供应商额度或专属模型。密钥在服务端加密保存，不会显示给平台管理员或其他用户。"
      config={personal ?? emptyConfig}
      apiKey={personalKey}
      onChange={setPersonal}
      onKeyChange={setPersonalKey}
      onSave={() => save('personal')}
      saving={saving === 'personal'}
      keyLabel="个人 API Key"
      enabledLabel="优先使用我的 Key"
    />

    {isPlatformAdmin && <ConfigCard
      icon={<ShieldCheck className="h-5 w-5" />}
      eyebrow="PLATFORM DEFAULT"
      title="平台通用模型"
      description="为未启用个人 Key 的登录用户提供默认 Agent 服务。请使用部门或服务账号密钥，勿填入个人私钥。"
      config={platform ?? emptyConfig}
      apiKey={platformKey}
      onChange={setPlatform}
      onKeyChange={setPlatformKey}
      onSave={() => save('platform')}
      saving={saving === 'platform'}
      keyLabel="平台 API Key"
      enabledLabel="启用平台通用 Agent"
      platform
    />}

    {!isPlatformAdmin && <div className="flex gap-3 rounded-2xl border border-border-default bg-surface-subtle p-4 text-sm leading-6 text-text-secondary"><Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />平台通用模型由具备“配置 AI 助手”权限的管理员维护；你可以随时修改或关闭自己的优先连接。</div>}
  </div>;
}

function ConfigCard({ icon, eyebrow, title, description, config, apiKey, onChange, onKeyChange, onSave, saving, keyLabel, enabledLabel, platform = false }: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  description: string;
  config: AgentConfig;
  apiKey: string;
  onChange: (config: AgentConfig) => void;
  onKeyChange: (value: string) => void;
  onSave: () => void;
  saving: boolean;
  keyLabel: string;
  enabledLabel: string;
  platform?: boolean;
}) {
  const canEnable = config.key_configured || Boolean(apiKey.trim());
  return <section className="rounded-[1.5rem] border border-border-default bg-surface-elevated p-5 sm:p-6">
    <div className="flex items-start gap-3"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${platform ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300' : 'bg-primary-50 text-primary-600 dark:bg-primary-950/30 dark:text-primary-300'}`}>{icon}</span><div><p className="text-xs font-semibold tracking-[0.14em] text-text-tertiary">{eyebrow}</p><h3 className="mt-1 text-lg font-semibold text-text-primary">{title}</h3><p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">{description}</p></div></div>
    <div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm font-medium text-text-secondary">模型<input value={config.model} onChange={(event) => onChange({ ...config, model: event.target.value })} className="rounded-xl border border-border-default bg-surface px-3 py-2.5 text-text-primary outline-none focus:border-primary-400" placeholder="例如 MiniMax-M3" /></label><label className="grid gap-2 text-sm font-medium text-text-secondary">供应商标识<input value={config.provider} onChange={(event) => onChange({ ...config, provider: event.target.value })} className="rounded-xl border border-border-default bg-surface px-3 py-2.5 text-text-primary outline-none focus:border-primary-400" placeholder="openai-compatible" /></label></div>
    <label className="mt-4 grid gap-2 text-sm font-medium text-text-secondary">兼容接口基址<input value={config.base_url} onChange={(event) => onChange({ ...config, base_url: event.target.value })} className="rounded-xl border border-border-default bg-surface px-3 py-2.5 text-text-primary outline-none focus:border-primary-400" placeholder="https://api.openai.com/v1" /><small className="font-normal text-text-tertiary">可填 /v1 基址或完整 /chat/completions 地址；非本地地址必须使用 HTTPS。</small></label>
    <label className="mt-4 grid gap-2 text-sm font-medium text-text-secondary">{keyLabel}<input type="password" value={apiKey} onChange={(event) => onKeyChange(event.target.value)} className="rounded-xl border border-border-default bg-surface px-3 py-2.5 text-text-primary outline-none focus:border-primary-400" placeholder={config.key_configured ? '已配置；留空保持不变' : '输入 API Key'} /><small className="font-normal text-text-tertiary">{config.key_configured ? '服务端已保存加密密钥，留空不会覆盖。' : '输入后会加密保存，页面不会再显示明文。'}</small></label>
    <div className="mt-5 flex flex-wrap items-center justify-between gap-4"><label className="flex items-center gap-2 text-sm font-medium text-text-primary"><input type="checkbox" checked={config.enabled} onChange={(event) => onChange({ ...config, enabled: event.target.checked })} disabled={!canEnable && !config.enabled} />{enabledLabel}</label><Button onClick={onSave} disabled={saving || (config.enabled && !canEnable)} className="rounded-full">{saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />保存中…</> : <><Check className="mr-2 h-4 w-4" />保存设置</>}</Button></div>
  </section>;
}
