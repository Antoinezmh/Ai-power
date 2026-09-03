import { useNavigate } from 'react-router-dom';
import {
    Activity,
    ArrowRight,
    Bot,
    Box,
    ChevronRight,
    CircuitBoard,
    FileUp,
    FolderOpen,
    Gauge,
    Sparkles,
    TestTube2,
    Wrench,
} from 'lucide-react';
import { Button } from '@aixsilicon/ui';
import { useDashboardStats } from '@/features/dashboard/hooks/useDashboard';
import { useAuthStore } from '@/features/auth/stores/authStore';

const capabilityModules = [
    { index: '01', eyebrow: 'SPEC', title: '规格', description: '从客户需求到参数表、FoM 与热阻估算。', icon: Gauge, accent: 'bg-[#e8f1ff] text-[#1769d1]', href: '/capabilities/spec' },
    { index: '02', eyebrow: 'MODEL', title: '建模', description: 'TCAD 参数校准、子电路提取与 corner 分析。', icon: CircuitBoard, accent: 'bg-[#f0edff] text-[#6750c8]', href: '/capabilities/model' },
    { index: '03', eyebrow: 'TEST', title: '测试', description: 'SOA、双脉冲损耗、热阻拟合与 binning。', icon: TestTube2, accent: 'bg-[#e8f8f4] text-[#16846b]', href: '/capabilities/test' },
    { index: '04', eyebrow: 'RELIABILITY', title: '可靠性', description: 'HTOL 监测、寿命预测与样本预警。', icon: Activity, accent: 'bg-[#fff3e5] text-[#be6515]', href: '/capabilities/reliability' },
];

export default function Dashboard() {
    const navigate = useNavigate();
    const user = useAuthStore((state) => state.user);
    const { data: stats, isLoading, error } = useDashboardStats();
    const displayName = user?.full_name || user?.username || '工程师';
    const hasActivity = Boolean(stats && (stats.total_calls > 0 || stats.recent_tools?.length));
    const openToolMarket = () => navigate('/tools');

    return (
        <div className="mx-auto w-full max-w-7xl space-y-10 pb-10">
            <section className="relative overflow-hidden rounded-[2rem] border border-border-subtle bg-surface-elevated px-6 py-9 shadow-sm sm:px-10 sm:py-12">
                <div className="absolute right-0 top-0 h-56 w-56 translate-x-1/3 -translate-y-1/3 rounded-full bg-primary-100/70 blur-3xl dark:bg-primary-900/25" />
                <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_270px] lg:items-end">
                    <div>
                        <p className="text-xs font-semibold tracking-[0.18em] text-primary-600 dark:text-primary-400">AI POWER / WORKSPACE</p>
                        <h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-[-0.04em] text-text-primary sm:text-5xl">继续推进你的研发工作，{displayName}</h1>
                        <p className="mt-4 max-w-2xl text-base leading-7 text-text-secondary sm:text-lg">从规格定义到可靠性验证，工具、数据与 AI 助手都在同一个工作台中连续协作。</p>
                        <div className="mt-7 flex flex-wrap gap-3">
                            <Button onClick={openToolMarket} className="rounded-full px-5">浏览工具市场 <ArrowRight className="ml-2 h-4 w-4" /></Button>
                            <Button variant="secondary" onClick={() => navigate('/files')} className="rounded-full px-5">打开文件中心</Button>
                        </div>
                    </div>
                    <button type="button" onClick={() => navigate('/chat')} className="group rounded-[1.5rem] bg-[#111827] p-5 text-left text-white shadow-lg transition-transform duration-300 hover:-translate-y-1">
                        <div className="flex items-center justify-between"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10"><Sparkles className="h-4 w-4" /></span><ArrowRight className="h-4 w-4 text-white/60 transition-transform group-hover:translate-x-1" /></div>
                        <p className="mt-8 text-xs font-medium tracking-[0.14em] text-white/50">AI ASSISTANT</p>
                        <p className="mt-2 text-lg font-medium leading-6">从一句工程问题开始</p>
                        <p className="mt-2 text-sm leading-5 text-white/60">查阅文档、调用工具、整理分析思路。</p>
                    </button>
                </div>
            </section>

            <section>
                <div className="mb-5 flex items-end justify-between gap-4"><div><p className="text-xs font-semibold tracking-[0.16em] text-text-tertiary">CAPABILITIES</p><h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-text-primary">四个能力模块</h2></div><button onClick={openToolMarket} className="hidden items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700 sm:flex">查看全部工具 <ChevronRight className="h-4 w-4" /></button></div>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {capabilityModules.map((module) => {
                        const Icon = module.icon;
                        return <button key={module.index} type="button" onClick={() => navigate(module.href)} className="group min-h-60 rounded-[1.5rem] border border-border-default bg-surface-elevated p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:border-primary-200 hover:shadow-lg dark:hover:border-primary-800">
                            <div className="flex items-start justify-between"><span className="text-sm font-medium text-text-tertiary">{module.index}</span><span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${module.accent}`}><Icon className="h-5 w-5" /></span></div>
                            <p className="mt-10 text-xs font-semibold tracking-[0.14em] text-text-tertiary">{module.eyebrow}</p><h3 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-text-primary">{module.title}</h3><p className="mt-2 text-sm leading-6 text-text-secondary">{module.description}</p>
                            <span className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-primary-600 opacity-0 transition-opacity group-hover:opacity-100">进入模块 <ArrowRight className="h-3.5 w-3.5" /></span>
                        </button>;
                    })}
                </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.75fr)]">
                <div className="rounded-[1.5rem] border border-border-default bg-surface-elevated p-6 sm:p-7">
                    <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold tracking-[0.16em] text-text-tertiary">CONTINUE WORKING</p><h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-text-primary">{hasActivity ? '近期工作上下文' : '从一个工具开始'}</h2></div><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-surface-subtle text-text-secondary"><Wrench className="h-5 w-5" /></span></div>
                    {isLoading ? <div className="mt-7 h-32 animate-pulse rounded-2xl bg-surface-subtle" /> : error ? <div className="mt-7 rounded-2xl bg-danger-bg px-4 py-5 text-sm text-danger">统计服务暂不可用，但工具与文件中心仍可正常使用。</div> : hasActivity ? <div className="mt-6 divide-y divide-border-subtle">
                        {stats?.recent_tools.slice(0, 3).map((tool) => <button key={tool.id} onClick={openToolMarket} className="group flex w-full items-center gap-4 py-4 text-left first:pt-0 last:pb-0"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-surface-subtle text-lg">{tool.icon || '◫'}</span><span className="min-w-0 flex-1"><span className="block truncate font-medium text-text-primary">{tool.name}</span><span className="mt-1 block truncate text-sm text-text-secondary">{tool.description || '继续查看工具工作区'}</span></span><span className="hidden text-xs text-text-tertiary sm:block">{tool.time}</span><ChevronRight className="h-4 w-4 text-text-tertiary transition-transform group-hover:translate-x-1" /></button>)}
                    </div> : <div className="mt-7 rounded-2xl bg-surface-subtle p-5 sm:flex sm:items-center sm:justify-between sm:gap-6"><div><p className="font-medium text-text-primary">工具已经就绪，等待你的第一项任务。</p><p className="mt-1 text-sm leading-6 text-text-secondary">从 FoM 估算、SOA 绘制或 HTOL 监测开始，使用记录会在这里连续沉淀。</p></div><Button variant="secondary" onClick={openToolMarket} className="mt-4 shrink-0 rounded-full sm:mt-0">选择工具</Button></div>}
                </div>
                <div className="rounded-[1.5rem] border border-border-default bg-surface-elevated p-6 sm:p-7">
                    <p className="text-xs font-semibold tracking-[0.16em] text-text-tertiary">PLATFORM STATUS</p><h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-text-primary">工作台状态</h2>
                    <div className="mt-7 space-y-5"><StatusRow label="可用工具" value={stats?.active_tools ?? 0} suffix="个" /><StatusRow label="今日调用" value={stats?.today_calls ?? 0} suffix="次" /><StatusRow label="累计调用" value={stats?.total_calls ?? 0} suffix="次" /></div>
                    <div className="mt-7 border-t border-border-subtle pt-5"><button onClick={() => navigate('/files')} className="group flex w-full items-center gap-3 text-left"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-50 text-primary-600 dark:bg-primary-950/30"><FolderOpen className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-medium text-text-primary">文件中心</span><span className="mt-0.5 block text-xs text-text-secondary">统一管理研发数据与工具空间</span></span><ChevronRight className="h-4 w-4 text-text-tertiary transition-transform group-hover:translate-x-1" /></button></div>
                </div>
            </section>

            <section className="grid gap-4 md:grid-cols-3"><ActionCard icon={Box} title="工具市场" description="发现、收藏并进入部门工具。" onClick={openToolMarket} /><ActionCard icon={FileUp} title="导入研发数据" description="上传、归档并关联到工具空间。" onClick={() => navigate('/files')} /><ActionCard icon={Bot} title="询问 AI 助手" description="从问题、文档或一组测试数据开始。" onClick={() => navigate('/chat')} /></section>
        </div>
    );
}

function StatusRow({ label, value, suffix }: { label: string; value: number; suffix: string }) {
    return <div className="flex items-end justify-between border-b border-border-subtle pb-4 last:border-0 last:pb-0"><span className="text-sm text-text-secondary">{label}</span><span className="text-2xl font-semibold tracking-[-0.04em] text-text-primary">{value}<span className="ml-1 text-sm font-medium text-text-tertiary">{suffix}</span></span></div>;
}

function ActionCard({ icon: Icon, title, description, onClick }: { icon: typeof Bot; title: string; description: string; onClick: () => void }) {
    return <button onClick={onClick} className="group flex items-center gap-4 rounded-[1.25rem] border border-border-default bg-surface-elevated p-5 text-left transition-all hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-md dark:hover:border-primary-800"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-surface-subtle text-text-secondary group-hover:bg-primary-50 group-hover:text-primary-600 dark:group-hover:bg-primary-950/30"><Icon className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block font-medium text-text-primary">{title}</span><span className="mt-1 block text-sm text-text-secondary">{description}</span></span><ArrowRight className="h-4 w-4 shrink-0 text-text-tertiary transition-transform group-hover:translate-x-1" /></button>;
}
