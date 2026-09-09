import { businessFlows } from '@/features/workflows/catalog';
import { useState, type CSSProperties } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowUpRight, ArrowRight, ChevronRight, FolderOpen, Bot, Flag, Check, Clock3 } from 'lucide-react';
import { useAuthStore } from '@/features/auth/stores/authStore';
import '../CapabilityCenter/workspace.css';
import './projects.css';

const flows = businessFlows;
const stages = [
  { title: '目标对齐', owner: '项目负责人', output: 'SiC 器件规格、研发范围与验收依据', checks: ['确认器件类型、应用工况和目标电压等级', '明确电性、热性能与可靠性目标及测试条件', '落实研发分工、样品周期与阶段评审责任'] },
  { title: '方案评审', owner: '设计 / 外延', output: '元胞与终端方案、SiC 外延规格', checks: ['核对漂移层厚度、掺杂与耐压设计约束', '评审元胞、终端与工艺可实现性及 TCAD 依据', '记录评审决议与待办事项'] },
  { title: '工艺开发', owner: '工艺 / 设计', output: '关键工艺窗口、Split 分片与流片计划', checks: ['评审注入激活、栅介质及接触等适用工序', '确认 Split 变量、晶圆分配与过程量测项目', '关联工艺履历、晶圆电测与失效分类'] },
  { title: '样品验证', owner: '验证 / 可靠性 / 应用', output: '性能、可靠性与应用评价报告', checks: ['核对样品批次、封装形式和测试边界', '分别评审静态电性、动态波形与可靠性结果', '对照应用工况，闭环异常并确认复验结论'] },
  { title: '量产导入', owner: '跨团队协作', output: '试产总结、量产基线与放行资料', checks: ['确认工艺、封装、晶圆及成品测试版本', '评审良率、可靠性证据和未关闭风险', '归档批次追溯与变更要求，记录放行决议'] },
];
const demoTasks = [
  { title: '确认 SiC 器件规格与测试条件', flow: '需求', status: '待评审', note: '输出：器件类型、工况与指标基线' },
  { title: '制定可靠性应力与读点计划', flow: '可靠性', status: '待开始', note: '输出：适用项目、样本批次与失效判据' },
  { title: '评审 SiC 器件驱动与回路方案', flow: '应用', status: '待开始', note: '输出：工况、驱动约束与保护验证计划' },
  { title: '整理量产导入放行条件', flow: '量产', status: '待开始', note: '输出：工艺基线、测试限值与放行依据' },
  { title: '核对 SiC 外延规格与缺陷分布', flow: '外延', status: '待开始', note: '输入：厚度、掺杂、均匀性与缺陷图' },
  { title: '评审关键工艺 Split 与分片计划', flow: '工艺', status: '进行中', note: '输出：实验变量、晶圆分配与量测项目' },
  { title: '整理元胞与终端设计评审依据', flow: '设计', status: '进行中', note: '输出：TCAD 校准、版图版本与性能取舍' },
  { title: '制定首轮电性与双脉冲测试计划', flow: '验证', status: '待评审', note: '输出：样品履历、测试条件与评价指标' },
];
type View = 'milestones' | 'tasks' | 'deliverables';

export default function ProjectWorkspace() {
  const [view, setView] = useState<View>('milestones');
  const [stage, setStage] = useState(1);
  const [filter, setFilter] = useState('全部');
  const navigate = useNavigate();
  const authenticated = useAuthStore(s => s.isAuthenticated);
  const open = (path: string) => navigate(authenticated ? path : '/login?redirect=' + encodeURIComponent(path));
  const ask = (prompt: string) => open('/chat?context=projects&prompt=' + encodeURIComponent(prompt));
  const current = stages[stage];
  return <div className="flow-page project-page" style={{ '--flow-accent': '#687ba3' } as CSSProperties}>
    <div className="flow-topline"><Link to="/dashboard">工作台</Link><ChevronRight size={13}/><span>项目管理</span><span className="flow-top-caption">AI × POWER / PROJECTS</span></div>
    <nav className="flow-nav" aria-label="业务流切换">{flows.map((flow, i) => <Link key={flow.id} to={'/capabilities/' + flow.id}><span>0{i+1}</span><flow.icon size={17}/>{flow.title}<ArrowUpRight size={14}/></Link>)}<Link to="/capabilities/projects" aria-current="page"><FolderOpen size={17}/>项目管理<ArrowUpRight size={14}/></Link></nav>
    <section className="flow-hero">
      <div className="flow-hero-copy"><div className="flow-eyebrow"><span/>PROJECT WORKSPACE</div><h1>串联 SiC 器件研发，<br/><em>从规格到量产导入。</em></h1><p>围绕 SiC 功率器件，串联八条业务流。以器件规格为起点，将外延批次、设计版本、工艺履历与样品评价纳入阶段评审，衔接试产和量产导入。</p><div className="flow-actions"><button className="flow-primary" onClick={() => ask('请帮我建立SiC 功率器件研发项目计划。先确认器件类型、应用工况、电压等级、工艺平台、样品周期、负责人和交付要求，再按需求、设计、外延、工艺、验证、可靠性、应用、量产拆解里程碑。')}><Bot size={17}/>用 AI 梳理项目<ArrowUpRight size={16}/></button><a className="flow-secondary" href="#project-board">探索项目工作台<ArrowRight size={16}/></a></div><div className="flow-hero-foot"><span>ONE PROJECT / EIGHT FLOWS</span><span>规格 · 流片 · 验证 · 导入</span></div></div>
      <div className="project-map"><div className="flow-visual-head"><span>协作地图</span><span>研发组织示意</span></div><div className="project-map-body"><div className="project-center"><Flag size={22}/><strong>项目目标</strong><small>器件规格与阶段放行依据</small></div><div className="project-streams">{flows.map(flow => <Link key={flow.id} to={'/capabilities/' + flow.id}><flow.icon size={22}/><strong>{flow.title}</strong><ArrowUpRight size={13}/></Link>)}</div><div className="project-map-end"><Check size={15}/>阶段评审<span>→</span>放行与归档</div></div><p className="flow-visual-note">点击业务流进入工作区，项目管理贯穿整个研发过程。</p></div>
    </section>
    <div className="project-notice"><span>页面预览</span><p>下方为项目模板与示例任务，尚未连接内部项目数据。切换视图和阶段可预览协作方式；AI 助手、工具与文件中心可直接进入。</p></div>
    <section id="project-board" className="project-board"><div className="flow-section-title"><div><span className="flow-eyebrow">PROJECT PLAYBOOK</span><h2>一处看清，下一步做什么。</h2></div><span className="project-template-label">SiC 功率器件研发 · 示例模板</span></div>
      <div className="project-tabs" role="tablist" aria-label="项目视图">{([['milestones','阶段里程碑'],['tasks','协作任务'],['deliverables','交付资料']] as const).map(([key, title]) => <button key={key} id={'tab-'+key} role="tab" aria-selected={view === key} aria-controls="project-panel" onClick={() => setView(key)}>{title}</button>)}</div>
      <div id="project-panel" role="tabpanel" aria-labelledby={'tab-'+view}>
      {view === 'milestones' && <div className="project-milestones"><div className="project-stage-list">{stages.map((item,i) => <button key={item.title} className={stage === i ? 'selected' : ''} aria-pressed={stage === i} onClick={() => setStage(i)}><span>0{i+1}</span><div><strong>{item.title}</strong><small>{item.owner}</small></div><ChevronRight size={16}/></button>)}</div><div className="project-stage-detail"><span className="flow-eyebrow">STAGE 0{stage+1} / REVIEW GUIDE</span><h3>{current.title}</h3><p>建议交付：{current.output}</p><ul>{current.checks.map(text => <li key={text}><span className="project-check"/>{text}</li>)}</ul><div className="project-review-note"><Clock3 size={16}/><span>评审前确认输入完整，评审后记录结论、负责人和下一步。</span></div><button className="flow-text-button" onClick={() => ask('请帮我细化 SiC 功率器件研发项目的“'+current.title+'”阶段。预期交付：'+current.output+'。请生成任务拆解、评审要点和待确认问题。')}>让 AI 拆解这个阶段<ArrowUpRight size={15}/></button></div></div>}
      {view === 'tasks' && <div className="project-task-view"><div className="project-filters" aria-label="筛选任务业务流">{['全部',...flows.map(f => f.title)].map(name => <button key={name} aria-pressed={filter === name} onClick={() => setFilter(name)}>{name}</button>)}</div><div className="project-task-grid">{demoTasks.filter(t => filter === '全部' || t.flow === filter).map(task => <article key={task.title}><div><span>{task.flow}</span><small>{task.status} · 示例</small></div><h3>{task.title}</h3><p>{task.note}</p><button className="flow-text-button" onClick={() => ask('请帮我拆解 SiC 功率器件研发任务：'+task.title+'。'+task.note+'。列出所需输入、工作步骤和验收标准。')}>拆解任务<ArrowRight size={14}/></button></article>)}</div></div>}
      {view === 'deliverables' && <div className="project-deliverables">{[['立项与计划','器件规格、应用工况、流片计划与技术风险清单'],['工程过程资料','外延缺陷图、Split 分片、工艺履历、TCAD 与版图版本'],['验证与量产导入','电测与波形、可靠性报告、应用评价及量产放行资料']].map(([title, description],i) => <article key={title}><span>0{i+1}</span><FolderOpen size={25}/><h3>{title}</h3><p>{description}</p><button className="flow-text-button" onClick={() => open('/files')}>打开文件中心<ArrowUpRight size={14}/></button></article>)}</div>}
      </div>
    </section>
    <section className="flow-task-section"><div className="flow-section-title"><div><span className="flow-eyebrow">PROJECT ASSISTANT</span><h2>把协调的时间，留给关键判断。</h2></div></div><div className="flow-tasks">{[['项目启动','围绕器件规格、工艺平台与样品节点，梳理研发计划。','请协助我制作 SiC 功率器件研发项目的启动会议议程和输入清单，覆盖器件类型、外延规格、工艺平台、流片资源与样品评价。'],['风险梳理','识别外延交期、流片资源与测试能力对里程碑的影响。','请为 SiC 功率器件研发梳理八条业务流的依赖与风险，覆盖外延交期、工艺窗口、流片资源、封装与测试能力，并列出风险负责人和验证动作。'],['评审与周报','汇总批次进展、电性偏差与待决策项，跟踪验证闭环。','请提供 SiC 功率器件研发周报模板，包含流片与样品进展、电性和可靠性偏差、技术风险、待决策事项及下周计划。']].map(([title, description, prompt],i) => <button key={title} onClick={() => ask(prompt)}><div><span className="flow-task-number">0{i+1}</span><ArrowUpRight size={20}/></div><h3>{title}</h3><p>{description}</p><span className="flow-task-cta">与 AI 协作<ArrowRight size={14}/></span></button>)}</div></section>
    <footer className="flow-footer"><span>AI × POWER</span><span>SiC 研发项目管理 · 从规格定义到量产导入</span></footer>
  </div>;
}
