import { useEffect, useState } from 'react';
import { ArrowRight, Check, LockKeyhole, ShieldCheck, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { authApi, SsoConfig } from '@/features/auth/api/authApi';
import { useAuthStore } from '@/features/auth/stores/authStore';
import './login.css';

interface LoginResponse { access_token: string; refresh_token: string; token_type: string; }
interface UserInfo {
    id: string;
    username: string;
    email: string;
    full_name?: string;
    avatar?: string;
    roles: string[];
    permissions: string[];
    is_superuser: boolean;
}

const devAccounts = [
    { role: '平台管理员', username: 'admin', password: 'admin123' },
    { role: '部门负责人', username: 'manager', password: 'manager123' },
    { role: '工具负责人', username: 'tooladmin', password: 'tool123' },
    { role: '研发工程师', username: 'zhangsan', password: '123456' },
    { role: '只读协作者', username: 'viewer', password: 'viewer123' },
];

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [ssoConfig, setSsoConfig] = useState<SsoConfig | null>(null);
    const navigate = useNavigate();
    const { setAuth } = useAuthStore();

    const finalizeLogin = async (accessToken: string, refreshToken: string) => {
        const user = await api.get<UserInfo>('/api/v1/auth/me', { token: accessToken });
        setAuth(user, accessToken, refreshToken);
        const redirect = new URLSearchParams(window.location.search).get('redirect');
        navigate(redirect || '/dashboard', { replace: true });
    };

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        if (!code) return;
        (async () => {
            setLoading(true);
            try {
                const result = await authApi.ssoCallback({ code, state: params.get('state') || undefined });
                await finalizeLogin(result.access_token, result.refresh_token);
            } catch (err) {
                setError(err instanceof Error ? err.message : '统一登录失败');
                window.history.replaceState({}, '', window.location.pathname);
            } finally { setLoading(false); }
        })();
    }, []);

    useEffect(() => {
        authApi.getSsoConfig().then(setSsoConfig).catch(() => setSsoConfig(null));
    }, []);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setLoading(true);
        setError('');
        try {
            const result = await api.post<LoginResponse>('/api/v1/auth/login', { username, password });
            await finalizeLogin(result.access_token, result.refresh_token);
        } catch (err) {
            setError(err instanceof Error ? err.message : '登录失败');
        } finally { setLoading(false); }
    };

    return (
        <div className="login-shell">
            <section className="login-main">
                <header className="login-header">
                    <a href="/" className="login-brand"><span className="login-brand-mark">AP</span><span>AI POWER</span></a>
                    <a href="/" className="login-home-link">返回首页 <ArrowRight size={14} /></a>
                </header>

                <main className="login-content">
                    <div className="login-eyebrow">INTERNAL WORKSPACE</div>
                    <h1>进入研发工作台</h1>
                    <p className="login-intro">使用部门账号，继续你的功率器件研发工作。</p>

                    <form onSubmit={handleSubmit} className="login-form">
                        <label>用户名<input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="请输入部门账号" autoComplete="username" required /></label>
                        <label>密码<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="请输入密码" autoComplete="current-password" required /></label>
                        {error && <div className="login-error">✕ {error}</div>}
                        <button type="submit" className="login-submit" disabled={loading}>{loading ? '登录中…' : '登录'}<ArrowRight size={16} /></button>
                    </form>

                    {ssoConfig?.enabled && <div className="login-sso"><span>或</span><button type="button" onClick={() => { if (ssoConfig.authorize_url) window.location.href = ssoConfig.authorize_url; }} disabled={loading}>使用统一身份登录</button></div>}

                    <details className="login-dev-accounts">
                        <summary>开发测试账号 <span>点击账号可快速填充</span></summary>
                        <div className="login-account-list">{devAccounts.map((account) => <button type="button" key={account.username} onClick={() => { setUsername(account.username); setPassword(account.password); setError(''); }}><span>{account.role}</span><code>{account.username}</code><small>{account.password}</small><Check size={13} /></button>)}</div>
                    </details>
                </main>

                <footer className="login-footer"><span><i />服务正常</span><span>© 2026 功率器件研发部 · 内部使用</span></footer>
            </section>

            <aside className="login-aside">
                <div className="login-aside-inner">
                    <div className="login-eyebrow">AI POWER / ENGINEERING PLATFORM</div>
                    <h2>把工程问题，<br /><em>带进一个工作台。</em></h2>
                    <p>从规格定义到可靠性验证，工具、资料与 AI 助手在同一条研发链路中协作。</p>
                    <div className="login-flow"><FlowItem number="01" label="定义规格" /><FlowItem number="02" label="调用工具" /><FlowItem number="03" label="沉淀结论" /></div>
                    <div className="login-aside-meta"><span><Sparkles size={15} /> AI ASSISTANT</span><span><ShieldCheck size={15} /> 部门级权限隔离</span><span><LockKeyhole size={15} /> 安全工作空间</span></div>
                </div>
            </aside>
        </div>
    );
}

function FlowItem({ number, label }: { number: string; label: string }) {
    return <div className="login-flow-item"><span>{number}</span><strong>{label}</strong></div>;
}
