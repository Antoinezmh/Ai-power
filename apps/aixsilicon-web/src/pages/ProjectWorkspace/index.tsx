import { useState, type CSSProperties } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowUpRight, ArrowRight, ChevronRight, FolderOpen, Bot, Layers3, FlaskConical, CircuitBoard, ShieldCheck, Flag, Check, Clock3 } from 'lucide-react';
import { useAuthStore } from '@/features/auth/stores/authStore';
import '../CapabilityCenter/workspace.css';
import './projects.css';

const flows = [
  { id: 'epitaxy', title: '外延', icon: Layers3 },
  { id: 'process', title: '工艺', icon: FlaskConical },
  { id: 'design', title: '设计', icon: CircuitBoard },
  { id: 'validation', title: '验证', icon: ShieldCheck },
];
const stages = [
  { title: '目标对齐', owner: '项目负责人', output: '项目目标、范围与成功标准', checks: ['确认应用场景和器件指标', '定义项目范围与阶段交付物', '明确负责人和评审参与方'] },
  { title: '方案评审', owner: '设计 / 外延', output: '结构方案与材料输入', checks: ['核对外延和结构参数约束', '整理候选方案与性能取舍', '记录评审决议与待办事项'] },
  { title: '工艺开发', owner: '工艺 / 设计', output: '工艺窗口与样品计划', checks: ['明确关键工序与控制点', '规划 split 实验和样品需求', '确认过程风险与验证方法'] },
  { title: '样品验证', owner: '验证 / 项目负责人', output: '测试结果与异常闭环', checks: ['确认样本与测试条件', '汇总电性、动态与可靠性结果', '跟进异常归因和改善验证'] },
  { title: '交付归档', owner: '跨团队协作', output: '交付清单与项目复盘', checks: ['核对交付资料与版本', '记录未关闭事项和后续责任', '沉淀复盘结论与工程经验'] },
];
const demoTasks = [
  { title: '确认外延来料评价指标', flow: '外延', status: '待开始', note: '输入：材料规格与均匀性要求' },
  { title: '梳理关键工序控制点', flow: '工艺', status: '进行中', note: '输出：参数窗口与实验分支' },
  { title: '整理器件结构评审依据', flow: '设计', status: '进行中', note: '输出：仿真条件与方案取舍' },
  { title: '制定首轮样品测试计划', flow: '验证', status: '待评审', note: '输出：样本、条件与判定标准' },
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
      <div className="flow-hero-copy"><div className="flow-eyebrow"><span/>PROJECT WORKSPACE</div><h1>让每一项研发，<br/><em>有方向，也有交付。</em></h1><p>连接外延、工艺、设计与验证。从目标对齐到样品交付，在同一处组织里程碑、协作任务与工程资料。</p><div className="flow-actions"><button className="flow-primary" onClick={() => ask('请帮我建立功率器件研发项目计划。先向我确认项目目标、周期、负责人和交付要求，再按外延、工艺、设计、验证拆解里程碑。')}><Bot size={17}/>用 AI 梳理项目<ArrowUpRight size={16}/></button><a className="flow-secondary" href="#project-board">探索项目工作台<ArrowRight size={16}/></a></div><div className="flow-hero-foot"><span>ONE PROJECT / FOUR FLOWS</span><span>目标 · 协作 · 交付</span></div></div>
      <div className="project-map"><div className="flow-visual-head"><span>协作地图</span><span>研发组织示意</span></div><div className="project-map-body"><div className="project-center"><Flag size={22}/><strong>项目目标</strong><small>共同的输入与交付标准</small></div><div className="project-streams">{flows.map(flow => <Link key={flow.id} to={'/capabilities/' + flow.id}><flow.icon size={22}/><strong>{flow.title}</strong><ArrowUpRight size={13}/></Link>)}</div><div className="project-map-end"><Check size={15}/>阶段评审<span>→</span>交付与复盘</div></div><p className="flow-visual-note">点击业务流进入工作区，项目管理贯穿整个研发过程。</p></div>
    </section>
    <div className="project-notice"><span>页面预览</span><p>下方为项目模板与示例任务，尚未连接内部项目数据。切换视图和阶段可预览协作方式；AI 助手、工具与文件中心可直接进入。</p></div>
    <section id="project-board" className="project-board"><div className="flow-section-title"><div><span className="flow-eyebrow">PROJECT PLAYBOOK</span><h2>一处看清，下一步做什么。</h2></div><span className="project-template-label">功率器件研发 · 示例模板</span></div>
      <div className="project-tabs" role="tablist" aria-label="项目视图">{([['milestones','阶段里程碑'],['tasks','协作任务'],['deliverables','交付资料']] as const).map(([key, title]) => <button key={key} id={'tab-'+key} role="tab" aria-selected={view === key} aria-controls="project-panel" onClick={() => setView(key)}>{title}</button>)}</div>
      <div id="project-panel" role="tabpanel" aria-labelledby={'tab-'+view}>
      {view === 'milestones' && <div className="project-milestones"><div className="project-stage-list">{stages.map((item,i) => <button key={item.title} className={stage === i ? 'selected' : ''} aria-pressed={stage === i} onClick={() => setStage(i)}><span>0{i+1}</span><div><strong>{item.title}</strong><small>{item.owner}</small></div><ChevronRight size={16}/></button>)}</div><div className="project-stage-detail"><span className="flow-eyebrow">STAGE 0{stage+1} / REVIEW GUIDE</span><h3>{current.title}</h3><p>建议交付：{current.output}</p><ul>{current.checks.map(text => <li key={text}><span className="project-check"/>{text}</li>)}</ul><div className="project-review-note"><Clock3 size={16}/><span>评审前确认输入完整，评审后记录结论、负责人和下一步。</span></div><button className="flow-text-button" onClick={() => ask('请帮我细化研发项目的“'+current.title+'”阶段。预期交付：'+current.output+'。请生成任务拆解、评审要点和待确认问题。')}>让 AI 拆解这个阶段<ArrowUpRight size={15}/></button></div></div>}
      {view === 'tasks' && <div className="project-task-view"><div className="project-filters" aria-label="筛选任务业务流">{['全部',...flows.map(f => f.title)].map(name => <button key={name} aria-pressed={filter === name} onClick={() => setFilter(name)}>{name}</button>)}</div><div className="project-task-grid">{demoTasks.filter(t => filter === '全部' || t.flow === filter).map(task => <article key={task.title}><div><span>{task.flow}</span><small>{task.status} · 示例</small></div><h3>{task.title}</h3><p>{task.note}</p><button className="flow-text-button" onClick={() => ask('请帮我拆解项目任务：'+task.title+'。'+task.note+'。列出所需输入、工作步骤和验收标准。')}>拆解任务<ArrowRight size={14}/></button></article>)}</div></div>}
      {view === 'deliverables' && <div className="project-deliverables">{[['立项与计划','目标范围、角色分工、里程碑与风险清单'],['工程过程资料','外延评价、工艺记录、结构仿真与设计评审'],['验证与交付','测试原始数据、验证报告、异常闭环与版本清单']].map(([title, description],i) => <article key={title}><span>0{i+1}</span><FolderOpen size={25}/><h3>{title}</h3><p>{description}</p><button className="flow-text-button" onClick={() => open('/files')}>打开文件中心<ArrowUpRight size={14}/></button></article>)}</div>}
      </div>
    </section>
    <section className="flow-task-section"><div className="flow-section-title"><div><span className="flow-eyebrow">PROJECT ASSISTANT</span><h2>把协调的时间，留给关键判断。</h2></div></div><div className="flow-tasks">{[['项目启动','从目标与约束出发，形成可讨论的研发计划。','请协助我制作功率器件研发项目的启动会议议程和输入清单。'],['风险梳理','识别跨阶段依赖，提前澄清潜在阻塞。','请帮我梳理外延、工艺、设计、验证之间的项目依赖与风险检查表。'],['评审与周报','整理进展、待办与决策，让信息同步更清楚。','请提供研发项目周报模板，包含本周进展、风险、待决策事项及下周计划。']].map(([title, description, prompt],i) => <button key={title} onClick={() => ask(prompt)}><div><span className="flow-task-number">0{i+1}</span><ArrowUpRight size={20}/></div><h3>{title}</h3><p>{description}</p><span className="flow-task-cta">与 AI 协作<ArrowRight size={14}/></span></button>)}</div></section>
    <footer className="flow-footer"><span>AI × POWER</span><span>项目管理 · 从共同目标到工程交付</span></footer>
  </div>;
}
