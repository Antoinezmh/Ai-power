import { type ComponentType, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  Bot,
  CircuitBoard,
  FileText,
  FlaskConical,
  Layers3,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import { Button } from '@aixsilicon/ui';
import { useToolsInfinite } from '@/features/tools/hooks/useTools';
import { useAuthStore } from '@/features/auth/stores/authStore';

type ModuleId = 'epitaxy' | 'process' | 'design' | 'validation';

type CapabilityModule = {
  id: ModuleId;
  index: string;
  eyebrow: string;
  title: string;
  summary: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  accent: string;
  focus: string[];
  agentPrompt: string;
  stage: string;
};

const modules: Record<ModuleId, CapabilityModule> = {
  epitaxy: {
    id: 'epitaxy', index: '01', eyebrow: 'EPITAXY', title: '外延', summary: '把外延结构、掺杂窗口与来料数据收敛为可追溯的工程输入。',
    description: '围绕外延层厚度、电阻率、掺杂浓度与片内均匀性，建立从规格设定到来料评价的连续依据。',
    icon: Layers3, accent: 'bg-[#e8f1ff] text-[#1769d1]', stage: 'FLOW 01 外延工程',
    focus: ['外延结构与耐压目标拆解', '厚度、电阻率与掺杂窗口分析', '来料测试、均匀性与异常追溯'],
    agentPrompt: '请协助我梳理当前器件的外延结构、掺杂窗口和待确认的来料评价指标。',
  },
  process: {
    id: 'process', index: '02', eyebrow: 'PROCESS', title: '工艺', summary: '让工艺流程、关键参数与过程窗口可控协同。',
    description: '统一承载光刻、注入、扩散、氧化、刻蚀与金属化等过程数据，连接工艺窗口和制造结果。',
    icon: FlaskConical, accent: 'bg-[#f0edff] text-[#6750c8]', stage: 'FLOW 02 工艺开发',
    focus: ['工艺流程与关键控制点管理', '热预算、注入与扩散窗口分析', '过程异常、split lot 与良率追溯'],
    agentPrompt: '请帮我规划当前器件的工艺流程、关键参数窗口和需要验证的 split 方案。',
  },
  design: {
    id: 'design', index: '03', eyebrow: 'DESIGN', title: '设计', summary: '从器件结构到版图取舍，形成可制造的性能方案。',
    description: '在同一空间连接 TCAD、结构参数、终端设计、版图规则和 SPICE 模型，让设计决策有据可查。',
    icon: CircuitBoard, accent: 'bg-[#e8f8f4] text-[#16846b]', stage: 'FLOW 03 器件设计',
    focus: ['结构参数、终端与 cell 设计', 'TCAD 仿真与工艺协同校准', '版图规则、SPICE 与 corner 输出'],
    agentPrompt: '请协助我规划器件结构、TCAD 仿真和版图设计之间的验证路径。',
  },
  validation: {
    id: 'validation', index: '04', eyebrow: 'VALIDATION', title: '验证', summary: '用电性、动态与可靠性证据确认设计和工艺结果。',
    description: '连接参数测试、SOA、双脉冲、热阻、HTOL 与失效分析，形成从样品到结论的验证闭环。',
    icon: ShieldCheck, accent: 'bg-[#fff3e5] text-[#be6515]', stage: 'FLOW 04 产品验证',
    focus: ['静态、动态与热特性测试', 'SOA、双脉冲与 binning 分析', '可靠性试验、失效归因与报告'],
    agentPrompt: '请协助我分析当前验证数据，并整理电性、动态和可靠性试验的下一步工作。',
  },
};

export default function CapabilityCenter({ moduleId }: { moduleId: ModuleId }) {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const module = modules[moduleId];
  const Icon = module.icon;
  const { data, isLoading } = useToolsInfinite({ group_name: module.title });
  const tools = useMemo(() => data?.pages.flat() ?? [], [data]);
  const loginHref = `/login?redirect=${encodeURIComponent(`/capabilities/${module.id}`)}`;

  const openWorkspace = () => navigate(isAuthenticated ? '/tools' : loginHref);
  const openAgent = () => navigate(isAuthenticated ? `/chat?context=capability:${module.id}&prompt=${encodeURIComponent(module.agentPrompt)}` : loginHref);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 pb-10">
      <section className="relative overflow-hidden rounded-[2rem] border border-border-subtle bg-surface-elevated px-6 py-9 shadow-sm sm:px-10 sm:py-12">
        <div className="absolute right-0 top-0 h-64 w-64 translate-x-1/4 -translate-y-1/3 rounded-full bg-primary-100/70 blur-3xl dark:bg-primary-900/20" />
        <div className="relative max-w-3xl">
          <div className="flex items-center gap-3"><span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${module.accent}`}><Icon className="h-5 w-5" /></span><span className="text-sm font-medium text-text-tertiary">{module.index} / {module.eyebrow}</span></div>
          <p className="mt-8 text-xs font-semibold tracking-[0.18em] text-primary-600 dark:text-primary-400">CAPABILITY WORKSPACE · {module.stage}</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-text-primary sm:text-6xl">{module.title}工作区</h1>
          <p className="mt-4 text-xl font-medium tracking-[-0.02em] text-text-primary">{module.summary}</p>
          <p className="mt-3 max-w-2xl text-base leading-7 text-text-secondary">{module.description}</p>
          <div className="mt-8 flex flex-wrap gap-3"><Button onClick={openWorkspace} className="rounded-full px-5">浏览模块工具 <ArrowRight className="ml-2 h-4 w-4" /></Button><Button variant="secondary" onClick={() => navigate('/files')} className="rounded-full px-5">打开相关资料</Button></div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.75fr)]">
        <div className="rounded-[1.5rem] border border-border-default bg-surface-elevated p-6 sm:p-7">
          <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold tracking-[0.16em] text-text-tertiary">MODULE PLAYBOOK</p><h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-text-primary">这一阶段要完成什么</h2></div><Layers3 className="h-5 w-5 text-text-tertiary" /></div>
          <div className="mt-7 grid gap-3 sm:grid-cols-3">{module.focus.map((item, index) => <div key={item} className="rounded-2xl bg-surface-subtle p-4"><span className="text-xs font-semibold text-primary-600 dark:text-primary-400">0{index + 1}</span><p className="mt-4 text-sm font-medium leading-6 text-text-primary">{item}</p></div>)}</div>
        </div>
        <button type="button" onClick={openAgent} className="group rounded-[1.5rem] bg-[#111827] p-6 text-left text-white transition-transform duration-300 hover:-translate-y-1 hover:shadow-lg">
          <div className="flex items-center justify-between"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10"><Bot className="h-5 w-5" /></span><ArrowRight className="h-4 w-4 text-white/60 transition-transform group-hover:translate-x-1" /></div>
          <p className="mt-10 text-xs font-semibold tracking-[0.14em] text-white/50">MODULE AGENT</p><h2 className="mt-2 text-xl font-medium">从一个工程问题开始</h2><p className="mt-2 text-sm leading-6 text-white/60">带着当前模块的上下文进入 AI 助手，继续拆解问题、调用资料和工具。</p>
        </button>
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.75fr)]">
        <div className="rounded-[1.5rem] border border-border-default bg-surface-elevated p-6 sm:p-7">
          <div className="flex items-end justify-between gap-4"><div><p className="text-xs font-semibold tracking-[0.16em] text-text-tertiary">TOOLS</p><h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-text-primary">模块工具</h2></div><button type="button" onClick={openWorkspace} className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700">工具市场 <ArrowRight className="h-4 w-4" /></button></div>
          {isLoading ? <div className="mt-6 h-28 animate-pulse rounded-2xl bg-surface-subtle" /> : tools.length > 0 ? <div className="mt-6 divide-y divide-border-subtle">{tools.slice(0, 4).map((tool) => <button type="button" key={tool.id} onClick={openWorkspace} className="group flex w-full items-center gap-4 py-4 text-left first:pt-0 last:pb-0"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-surface-subtle text-lg">{tool.icon || '◫'}</span><span className="min-w-0 flex-1"><span className="block truncate font-medium text-text-primary">{tool.name}</span><span className="mt-1 block truncate text-sm text-text-secondary">{tool.description || '进入工具继续处理'}</span></span><ArrowRight className="h-4 w-4 shrink-0 text-text-tertiary transition-transform group-hover:translate-x-1" /></button>)}</div> : <div className="mt-6 rounded-2xl bg-surface-subtle p-5"><p className="font-medium text-text-primary">这个模块正在建设工具插槽。</p><p className="mt-1 text-sm leading-6 text-text-secondary">后续将工具的分组设为“{module.title}”，它便会自动出现在这里。</p></div>}
        </div>
        <div className="rounded-[1.5rem] border border-border-default bg-surface-elevated p-6 sm:p-7"><p className="text-xs font-semibold tracking-[0.16em] text-text-tertiary">NEXT CONNECTIONS</p><h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-text-primary">建设插槽</h2><div className="mt-7 space-y-4"><Connection icon={FileText} title="资料空间" description="沉淀原始数据、报告与设计输入。" onClick={() => navigate('/files')} /><Connection icon={Wrench} title="工具挂载" description="静态网页、容器工具和外部服务统一接入。" onClick={openWorkspace} /><Connection icon={Activity} title="流程记录" description="后续可接入 Gate、任务和审查记录。" onClick={() => navigate('/dashboard')} /></div></div>
      </section>
    </div>
  );
}

function Connection({ icon: Icon, title, description, onClick }: { icon: ComponentType<{ className?: string }>; title: string; description: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="group flex w-full items-center gap-3 text-left"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-surface-subtle text-text-secondary"><Icon className="h-4.5 w-4.5" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-medium text-text-primary">{title}</span><span className="mt-0.5 block text-xs leading-5 text-text-secondary">{description}</span></span><ArrowRight className="h-4 w-4 text-text-tertiary transition-transform group-hover:translate-x-1" /></button>;
}
