import { type ComponentType, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  Bot,
  CircuitBoard,
  FileText,
  FlaskConical,
  Gauge,
  Layers3,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import { Button } from '@aixsilicon/ui';
import { useToolsInfinite } from '@/features/tools/hooks/useTools';
import { useAuthStore } from '@/features/auth/stores/authStore';

type ModuleId = 'spec' | 'model' | 'test' | 'reliability';

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
  spec: {
    id: 'spec', index: '01', eyebrow: 'SPECIFICATION', title: '规格', summary: '把客户需求收敛为可验证的器件定义。',
    description: '在这里组织参数表、FoM、热阻与应用边界，让每一项设计输入都有可追溯的依据。',
    icon: Gauge, accent: 'bg-[#e8f1ff] text-[#1769d1]', stage: 'G0 规格定义',
    focus: ['需求与 datasheet 差异分析', 'FoM、Ron,sp 与热阻估算', '设计输入与准出条件归档'],
    agentPrompt: '请协助我梳理当前器件的规格定义、关键 FoM 和待确认的设计输入。',
  },
  model: {
    id: 'model', index: '02', eyebrow: 'MODELING', title: '建模', summary: '让仿真参数与实测结果持续对齐。',
    description: '聚合 TCAD 校准、子电路提取和 corner 分析工作，为器件决策提供可复用的模型基础。',
    icon: CircuitBoard, accent: 'bg-[#f0edff] text-[#6750c8]', stage: 'G1 建模验证',
    focus: ['IV / CV 实测数据校准', 'TCAD 参数与工艺窗口管理', 'SPICE 子电路与 corner 输出'],
    agentPrompt: '请帮我规划 TCAD 参数校准与 SPICE 子电路提取的建模工作。',
  },
  test: {
    id: 'test', index: '03', eyebrow: 'CHARACTERIZATION', title: '测试', summary: '把测试波形转化为清晰的器件结论。',
    description: '在同一空间连接 SOA、双脉冲、热阻拟合与 binning 分析，沉淀测试过程与结果。',
    icon: FlaskConical, accent: 'bg-[#e8f8f4] text-[#16846b]', stage: 'G4 测试表征',
    focus: ['SOA 与 TLP 安全边界分析', '双脉冲开关损耗提取', '热阻拟合、binning 与报告输出'],
    agentPrompt: '请协助我分析测试数据，并整理 SOA、双脉冲损耗和热阻的下一步工作。',
  },
  reliability: {
    id: 'reliability', index: '04', eyebrow: 'RELIABILITY', title: '可靠性', summary: '让每一次老化试验都通向可解释的寿命判断。',
    description: '围绕 HTOL、寿命预测、失效归因与样本预警，构建连续的可靠性证据链。',
    icon: ShieldCheck, accent: 'bg-[#fff3e5] text-[#be6515]', stage: 'G5 可靠性验证',
    focus: ['HTOL / HTRB 老化试验跟踪', '寿命分布与失效机理分析', '样本异常预警与闭环归因'],
    agentPrompt: '请协助我梳理可靠性试验、寿命预测和样本预警的分析路径。',
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
