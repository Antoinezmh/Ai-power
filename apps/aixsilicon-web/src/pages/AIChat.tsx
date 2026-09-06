import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowUpRight, BookOpen, Check, ChevronRight, Copy, Loader2, RotateCcw, Send, Settings2, Sparkles, Wrench } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@aixsilicon/ui';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { chatApi, type AgentConfig, type AgentStatus, type KnowledgeSource, type ToolSuggestion } from '@/features/chat/api/chatApi';
import { MessageMarkdown } from '@/features/chat/components/MessageMarkdown';
import { parseThinking } from '@/features/chat/utils/parseThinking';
import './ai-chat.css';
import './chat-responsive.css';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  suggestions?: ToolSuggestion[];
  sources?: KnowledgeSource[];
  mode?: 'agent' | 'catalog';
  failedPrompt?: string;
};

const prompts = [
  '帮我选择 650V SiC MOSFET 的 FoM 分析工具',
  '双脉冲测试数据应如何开始分析？',
  '如何规划 HTOL 老化与寿命预测？',
];

const welcome: Message = {
  id: 'welcome',
  role: 'assistant',
  content: '告诉我你的器件、测试或可靠性问题。我会先给出分析路径，再匹配可以直接打开的部门工具。',
};

export default function AIChat() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const chatSessionId = useAuthStore((state) => state.chatSessionId);
  const ensureChatSessionId = useAuthStore((state) => state.ensureChatSessionId);
  const [messages, setMessages] = useState<Message[]>([welcome]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [config, setConfig] = useState<AgentConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(false);
  const [configError, setConfigError] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [historyReady, setHistoryReady] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);
  const sessionStorageKey = useMemo(() => user && chatSessionId ? `ai-power-chat:${user.id}:${chatSessionId}` : null, [chatSessionId, user]);

  useEffect(() => {
    chatApi.getStatus().then(setStatus).catch(() => setStatus(null));
  }, []);

  useEffect(() => {
    ensureChatSessionId();
  }, [ensureChatSessionId]);

  useEffect(() => {
    setHistoryReady(false);
    if (!sessionStorageKey) return;
    try {
      const cached = sessionStorage.getItem(sessionStorageKey);
      const restored = cached ? JSON.parse(cached) : null;
      if (Array.isArray(restored?.messages) && restored.messages.every((item: Message) => item && typeof item.id === 'string' && (item.role === 'user' || item.role === 'assistant') && typeof item.content === 'string')) {
        setMessages(restored.messages.slice(-40));
      } else {
        setMessages([welcome]);
      }
      if (typeof restored?.input === 'string') setInput(restored.input.slice(0, 8000));
    } catch {
      setMessages([welcome]);
    } finally {
      setHistoryReady(true);
    }
  }, [sessionStorageKey]);

  useEffect(() => {
    if (!historyReady || !sessionStorageKey || loading) return;
    const compact = messages.slice(-40);
    sessionStorage.setItem(sessionStorageKey, JSON.stringify({ messages: compact, input: input.slice(0, 8000) }));
  }, [historyReady, input, loading, messages, sessionStorageKey]);

  useEffect(() => {
    const prompt = searchParams.get('prompt');
    if (prompt) setInput(prompt);
  }, [searchParams]);

  useEffect(() => {
    const thread = threadRef.current;
    if (thread) thread.scrollTo({ top: thread.scrollHeight, behavior: messages.length > 1 ? 'smooth' : 'auto' });
  }, [messages, loading]);

  const openConfig = async () => {
    setConfigOpen(true);
    setConfigError('');
    setConfigLoading(true);
    try {
      setConfig(await chatApi.getPersonalConfig());
    } catch (error) {
      setConfigError(error instanceof Error ? error.message : '无法读取 Agent 配置');
    } finally {
      setConfigLoading(false);
    }
  };

  const send = async (preset?: string) => {
    const message = (preset ?? input).trim();
    if (!message || loading) return;
    setMessages((current) => [...current, { id: `u-${crypto.randomUUID()}`, role: 'user', content: message }]);
    setInput('');
    setLoading(true);
    try {
      const history = messages
        .filter((item) => item.id !== 'welcome' && !item.failedPrompt)
        .slice(-12)
        .map((item) => ({ role: item.role, content: item.content.slice(0, 4000) }));
      const result = await chatApi.send(message, history);
      const parsed = parseThinking(result.reply);
      setMessages((current) => [...current, {
        id: `a-${crypto.randomUUID()}`,
        role: 'assistant',
        content: parsed.content,
        suggestions: result.suggestions,
        sources: result.sources,
        mode: result.mode,
      }]);
      chatApi.getStatus().then(setStatus).catch(() => setStatus({ connected: result.mode === 'agent', mode: result.mode, source: result.mode === 'agent' ? 'platform' : 'catalog' }));
    } catch (error) {
      setMessages((current) => [...current, {
        id: `e-${crypto.randomUUID()}`,
        role: 'assistant',
        content: `暂时无法连接 AI 助手：${error instanceof Error ? error.message : '请稍后重试'}`,
        failedPrompt: message,
      }]);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    if (!config) return;
    setConfigLoading(true);
    setConfigError('');
    try {
      const saved = await chatApi.savePersonalConfig({
        provider: config.provider,
        model: config.model,
        base_url: config.base_url,
        enabled: config.enabled,
        ...(apiKey ? { api_key: apiKey } : {}),
      });
      setConfig(saved);
      setStatus({ connected: saved.enabled && saved.key_configured, mode: saved.enabled && saved.key_configured ? 'agent' : 'catalog', source: saved.enabled && saved.key_configured ? 'personal' : 'catalog' });
      setApiKey('');
      setConfigOpen(false);
    } catch (error) {
      setConfigError(error instanceof Error ? error.message : '保存失败');
    } finally {
      setConfigLoading(false);
    }
  };

  const statusLabel = status === null ? '正在检测 Agent' : status.connected ? status.source === 'personal' ? '使用个人 Key' : '使用平台 Key' : '工具推荐模式';

  return (
    <div className="agent-page">
      <section className="agent-hero">
        <div>
          <div className="agent-kicker"><Sparkles size={14} /> AI POWER ASSISTANT</div>
          <h1>从工程问题出发，<em>直接走向下一步。</em></h1>
          <p>分析思路、部门工具和研发资料，在同一个对话里衔接。</p>
        </div>
        <div className="agent-status">
          <span className={`agent-status-dot ${status?.connected ? 'is-connected' : ''}`} />
          {statusLabel}
          <button onClick={openConfig}><Settings2 size={15} />我的 Key</button>
        </div>
      </section>

      <section className="agent-workspace">
        <div className="agent-conversation">
          <div className="agent-thread" ref={threadRef} aria-live="polite">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                onOpenTool={(id) => navigate(`/tools?tool=${encodeURIComponent(id)}&from=agent`)}
                onRetry={(prompt) => send(prompt)}
              />
            ))}
            {loading && <div className="agent-thinking"><Loader2 size={16} className="animate-spin" /> 正在分析并匹配工具…</div>}
          </div>

          <div className="agent-composer-shell">
            <div className="agent-mobile-prompts">
              {prompts.map((prompt) => <button key={prompt} onClick={() => send(prompt)} disabled={loading}>{prompt}</button>)}
            </div>
            <div className="agent-composer">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                    event.preventDefault();
                    send();
                  }
                }}
                placeholder="描述器件、测试现象或希望完成的分析…"
                aria-label="向 AI 助手提问"
                rows={2}
              />
              <div className="agent-composer-footer">
                <span>Enter 发送 · Shift + Enter 换行</span>
                <button className="agent-send" onClick={() => send()} disabled={loading || !input.trim()} aria-label="发送消息">
                  <Send size={17} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <aside className="agent-sidebar">
          <div className="agent-side-label">QUICK START</div>
          <h2>从一个研发场景开始</h2>
          <p>选择常见问题，快速获得分析路径与工具建议。</p>
          <div className="agent-prompt-list">
            {prompts.map((prompt) => <button key={prompt} onClick={() => send(prompt)} disabled={loading}><span>{prompt}</span><ChevronRight size={16} /></button>)}
          </div>
          <div className="agent-side-note"><Wrench size={17} /><div><strong>建议不会自动执行</strong><p>工具打开和实际操作始终由你确认。</p></div></div>
        </aside>
      </section>

      {configOpen && <AgentConfigPanel config={config} loading={configLoading} error={configError} apiKey={apiKey} onClose={() => setConfigOpen(false)} onChange={setConfig} onKeyChange={setApiKey} onSave={saveConfig} />}
    </div>
  );
}

function MessageBubble({ message, onOpenTool, onRetry }: { message: Message; onOpenTool: (id: string) => void; onRetry: (prompt: string) => void }) {
  if (message.role === 'user') {
    return <article className="agent-message agent-message--user"><div className="agent-message-body"><div className="agent-message-name">你</div><p>{message.content}</p></div></article>;
  }
  const hasRecommendations = Boolean(message.suggestions?.length);
  return (
    <article className="agent-message agent-message--assistant">
      <div className="agent-avatar"><img src="/ai-power-logo.svg" alt="" width={36} height={36} /></div>
      <div className="agent-message-body">
        <div className="agent-message-heading">
          <div className="agent-message-name">AI POWER {message.mode === 'agent' && <span>AGENT</span>}</div>
          <button className="agent-icon-action" onClick={() => navigator.clipboard.writeText(message.content)} aria-label="复制回答"><Copy size={14} /></button>
        </div>
        {hasRecommendations ? <Tabs defaultValue="answer" className="agent-tabs">
          <TabsList className="agent-tabs-list">
            <TabsTrigger value="answer" className="agent-tab-trigger">回答</TabsTrigger>
            {hasRecommendations && <TabsTrigger value="recs" className="agent-tab-trigger">工具 <span className="agent-tab-count">{message.suggestions?.length}</span></TabsTrigger>}
          </TabsList>
          <TabsContent value="answer" className="agent-tab-content"><MessageMarkdown source={message.content} /></TabsContent>
          {hasRecommendations && <TabsContent value="recs" className="agent-tab-content"><div className="agent-tool-grid">{message.suggestions?.map((tool) => <button key={tool.id} className="agent-tool-chip" onClick={() => onOpenTool(tool.id)}><span className="agent-tool-icon">{tool.icon || '◌'}</span><span><strong>{tool.name}</strong><small>{tool.reason} · {tool.description || '部门工具'}</small><b>查看详情并启动</b></span><ArrowUpRight size={16} /></button>)}</div></TabsContent>}
        </Tabs> : <MessageMarkdown source={message.content} />}
        {message.sources?.length ? <div className="agent-sources"><div><BookOpen size={13} /> 平台知识依据</div>{message.sources.map((source, index) => <details key={`${source.source}-${index}`}><summary>{source.title}</summary><p>{source.excerpt}</p></details>)}</div> : null}
        {message.failedPrompt && <button className="agent-retry" onClick={() => onRetry(message.failedPrompt!)}><RotateCcw size={14} />重新发送</button>}
      </div>
    </article>
  );
}

function AgentConfigPanel({ config, loading, error, apiKey, onClose, onChange, onKeyChange, onSave }: { config: AgentConfig | null; loading: boolean; error: string; apiKey: string; onClose: () => void; onChange: (config: AgentConfig) => void; onKeyChange: (key: string) => void; onSave: () => void }) {
  return <div className="agent-config-backdrop" role="dialog" aria-modal="true" aria-label="个人 Agent 连接配置"><section className="agent-config-panel"><div className="agent-config-title"><div><span>PERSONAL AGENT</span><h2>我的模型连接</h2></div><button onClick={onClose}>关闭</button></div>{loading && !config ? <div className="agent-config-loading"><Loader2 className="animate-spin" /> 正在读取配置…</div> : config ? <div className="agent-config-form"><p className="text-xs leading-5 text-text-secondary">此 Key 仅用于当前账号，服务端加密保存；未启用时将自动使用平台通用模型。</p><label>模型<input value={config.model} onChange={(event) => onChange({ ...config, model: event.target.value })} placeholder="例如 gpt-4o-mini" /></label><label>兼容接口基址 <small>可填 /v1 基址或完整 /chat/completions 地址</small><input value={config.base_url} onChange={(event) => onChange({ ...config, base_url: event.target.value })} placeholder="https://api.openai.com/v1" /></label><label>个人 API Key <small>{config.key_configured ? '已配置；留空保持不变' : '仅加密保存于服务端'}</small><input type="password" value={apiKey} onChange={(event) => onKeyChange(event.target.value)} placeholder={config.key_configured ? '••••••••' : '输入个人 API Key'} /></label><label className="agent-config-switch"><input type="checkbox" checked={config.enabled} onChange={(event) => onChange({ ...config, enabled: event.target.checked })} />优先使用我的 Key</label>{error && <p className="agent-config-error">{error}</p>}<button className="agent-config-save" onClick={onSave} disabled={loading || (config.enabled && !config.key_configured && !apiKey)}>{loading ? '保存中…' : <><Check size={16} />保存个人配置</>}</button></div> : <p className="agent-config-error">{error || '配置暂时不可用'}</p>}</section></div>;
}
