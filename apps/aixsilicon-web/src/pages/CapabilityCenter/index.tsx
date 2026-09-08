import { useState, type CSSProperties } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Bot, CircuitBoard, FlaskConical, Layers3, ShieldCheck, FolderOpen, ChevronRight } from 'lucide-react';
import { useToolsInfinite } from '@/features/tools/hooks/useTools';
import { useAuthStore } from '@/features/auth/stores/authStore';
import './workspace.css';

type ModuleId = 'epitaxy' | 'process' | 'design' | 'validation';
const modules = {
  epitaxy: {
    title: '外延', en: 'EPITAXY', icon: Layers3, color: '#367e92', group: '外延组',
    headline: ['从一层材料，', '定义器件的可能。'],
    intro: '连接外延结构、材料参数与来料表征，让每一片晶圆都有清晰的工程起点。',
    label: '材料与结构', note: '从衬底到外延层，建立材料与电性之间的联系。',
    steps: ['定义材料目标', '评估外延结构', '分析来料数据', '沉淀评价结论'],
    tasks: [['结构与掺杂', '梳理厚度、掺杂浓度与耐压目标之间的约束。', '帮我梳理外延厚度、掺杂浓度与耐压目标之间的设计约束。'], ['来料与均匀性', '从片内分布、批次差异中寻找需要关注的信号。', '如何分析外延来料的厚度、电阻率和片内均匀性？'], ['缺陷与追溯', '组织缺陷记录，建立来料异常的排查路径。', '请为外延缺陷和来料异常整理一份排查清单。']],
    deliverables: ['外延规格与结构说明', '来料表征与均匀性记录', '批次异常与评价结论'],
  },
  process: {
    title: '工艺', en: 'PROCESS', icon: FlaskConical, color: '#a6713f', group: '工艺工程组',
    headline: ['让每一道工序，', '走向稳定的窗口。'],
    intro: '串联过程参数、实验分支与异常记录，把工艺开发中的经验变成可复用的依据。',
    label: '流程与窗口', note: '选择一道工序，聚焦它的输入、控制点和输出。',
    steps: ['拆解工艺流程', '设定参数窗口', '规划实验分支', '复盘过程结果'],
    tasks: [['参数窗口', '识别关键参数，梳理过程边界与控制要求。', '请帮我整理功率器件工艺的关键参数窗口和控制点。'], ['Split 实验', '明确实验变量、对照条件与评价指标。', '请协助我制定一个工艺 split 实验方案，先列出需要的输入。'], ['过程异常', '从现象回溯工序，组织分析与验证步骤。', '如何建立工艺异常、批次记录与电性结果之间的追溯关系？']],
    deliverables: ['工艺流程与控制点', 'Split 实验与参数记录', '异常分析与改善结论'],
  },
  design: {
    title: '设计', en: 'DEVICE DESIGN', icon: CircuitBoard, color: '#697ac6', group: '器件组',
    headline: ['让结构的每一次取舍，', '都有性能的回答。'],
    intro: '从器件结构到仿真、版图与模型，让设计目标与工程实现保持在同一条线上。',
    label: '结构与模型', note: '在结构、仿真与版图之间切换，组织下一步设计工作。',
    steps: ['明确性能目标', '探索器件结构', '校准仿真模型', '交付设计依据'],
    tasks: [['器件结构', '将耐压、导通损耗与开关性能转化为结构约束。', '请帮我梳理功率器件结构设计中的耐压、导通电阻和开关损耗取舍。'], ['TCAD 与模型', '对齐边界条件、材料参数和实测校准依据。', '请为 TCAD 仿真与实测数据校准列出工作计划。'], ['版图与终端', '围绕 cell、终端与规则组织设计检查。', '请整理功率器件 cell 和终端版图的设计检查清单。']],
    deliverables: ['器件结构与参数定义', '仿真校准与模型说明', '版图检查与设计结论'],
  },
  validation: {
    title: '验证', en: 'VALIDATION', icon: ShieldCheck, color: '#4a8c71', group: '系统与表征组',
    headline: ['从测试的信号，', '走向可信的结论。'],
    intro: '把电性、动态、热特性与可靠性连接起来，用完整的证据回答器件是否符合预期。',
    label: '测试与证据', note: '选择验证维度，明确输入数据与需要回答的问题。',
    steps: ['制定验证计划', '组织测试数据', '分析偏差与风险', '形成验证报告'],
    tasks: [['动态与损耗', '从双脉冲与波形中整理开关行为和损耗。', '请协助我规划双脉冲测试数据与开关损耗分析。'], ['可靠性与寿命', '组织试验条件、失效样本与寿命分析依据。', '请帮我梳理 HTOL、HTRB 可靠性试验的分析路径。'], ['报告与闭环', '连接测试条件、结果与判断，形成可追溯结论。', '请给我一份功率器件验证报告提纲，包含测试条件、结果和异常闭环。']],
    deliverables: ['测试计划与条件说明', '原始数据与分析记录', '验证报告与异常闭环'],
  },
} as const;

export default function CapabilityCenter({ moduleId }: { moduleId: ModuleId }) {
  const m = modules[moduleId];
  const navigate = useNavigate();
  const authenticated = useAuthStore(s => s.isAuthenticated);
  const { data, isLoading, isPlaceholderData, error, refetch, hasNextPage, fetchNextPage, isFetchingNextPage } = useToolsInfinite({ group_name: m.group });
  const tools = isPlaceholderData ? [] : data?.pages.flat() ?? [];
  const open = (path: string) => navigate(authenticated ? path : '/login?redirect=' + encodeURIComponent(path));
  const ask = (prompt: string) => open('/chat?context=capability:' + moduleId + '&prompt=' + encodeURIComponent(prompt));
  return <div className={'flow-page flow-' + moduleId} style={{ '--flow-accent': m.color } as CSSProperties}>
    <div className="flow-topline"><Link to="/dashboard">工作台</Link><ChevronRight size={13}/><span>{m.title}工作区</span><span className="flow-top-caption">AI × POWER / ENGINEERING</span></div>
    <nav className="flow-nav" aria-label="业务流切换">{Object.entries(modules).map(([id, item], index) => <Link key={id} to={'/capabilities/' + id} aria-current={moduleId === id ? 'page' : undefined}><span>0{index + 1}</span><item.icon size={17}/>{item.title}<ArrowUpRight size={14}/></Link>)}<Link to="/capabilities/projects"><FolderOpen size={17}/>项目管理<ArrowUpRight size={14}/></Link></nav>
    <section className="flow-hero">
      <div className="flow-hero-copy"><div className="flow-eyebrow"><span />{m.en} WORKSPACE</div><h1>{m.headline[0]}<br/><em>{m.headline[1]}</em></h1><p>{m.intro}</p><div className="flow-actions"><button className="flow-primary" onClick={() => ask(m.tasks[0][2])}><Bot size={17}/>与 {m.title} AI 开始<ArrowUpRight size={16}/></button><a className="flow-secondary" href="#flow-tools">探索相关工具<ArrowRight size={16}/></a></div><div className="flow-hero-foot"><span>0{Object.keys(modules).indexOf(moduleId) + 1} / 04</span><span>材料 · 过程 · 结构 · 证据</span></div></div>
      <div className="flow-visual"><div className="flow-visual-head"><span>{m.label}</span><span>工作示意 · 非实测数据</span></div><WorkspaceVisual key={moduleId} id={moduleId}/><p className="flow-visual-note">{m.note}</p></div>
    </section>
    <section className="flow-path" aria-label="建议工作路径"><span className="flow-path-label">工作路径<small>WORKING PATH</small></span>{m.steps.map((step, i) => <div key={step}><span>0{i + 1}</span><strong>{step}</strong>{i < 3 && <ChevronRight size={15}/>}</div>)}</section>
    <section className="flow-task-section"><div className="flow-section-title"><div><span className="flow-eyebrow">START WITH A QUESTION</span><h2>这次，从哪里开始？</h2></div><p>选择一个场景，带着问题进入 AI 助手。</p></div><div className="flow-tasks">{m.tasks.map(([title, description, prompt], i) => <button key={title} onClick={() => ask(prompt)}><div><span className="flow-task-number">0{i + 1}</span><ArrowUpRight size={20}/></div><h3>{title}</h3><p>{description}</p><span className="flow-task-cta">开始分析<ArrowRight size={14}/></span></button>)}</div></section>
    <section className="flow-bottom">
      <div id="flow-tools" className="flow-tools"><div className="flow-section-title"><div><span className="flow-eyebrow">TOOL LIBRARY</span><h2>{m.title}工具台</h2></div><button className="flow-text-button" onClick={() => open('/tools')}>工具市场<ArrowUpRight size={15}/></button></div><p className="flow-tools-note">来自「{m.group}」的已授权工具</p>
      {isLoading || isPlaceholderData ? <div className="flow-empty">正在加载工具…</div> : error ? <div className="flow-empty"><p>工具暂时加载失败</p><button className="flow-text-button" onClick={() => refetch()}>重新加载</button></div> : tools.length ? <div className="flow-tool-list">{tools.map(tool => <button key={tool.id} onClick={() => open('/tools?tool=' + encodeURIComponent(tool.id))}><span className="flow-tool-icon">{tool.icon || '◇'}</span><span><strong>{tool.name}</strong><small>{tool.description || '查看工具说明并启动'}</small></span><ArrowUpRight size={18}/></button>)}{hasNextPage && <button onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>{isFetchingNextPage ? '加载中…' : '加载更多工具'}</button>}</div> : <div className="flow-empty"><Layers3 size={26}/><h3>为下一项工作，找到合适的工具</h3><p>当前分组暂无可用工具。你可以浏览其他已授权工具，或先与 AI 梳理分析路径。</p><button className="flow-text-button" onClick={() => open('/tools')}>浏览工具市场<ArrowRight size={15}/></button></div>}</div>
      <aside className="flow-handoff"><FolderOpen size={24}/><span className="flow-eyebrow">KEEP THE EVIDENCE</span><h2>让工作有据可循。</h2><p>建议为本次{m.title}工作保留以下资料，方便下一步协作与复盘。</p><ul>{m.deliverables.map((item, i) => <li key={item}><span>0{i + 1}</span>{item}</li>)}</ul><button onClick={() => open('/files')}>前往文件中心<ArrowUpRight size={17}/></button></aside>
    </section>
    <footer className="flow-footer"><span>AI × POWER</span><span>{m.title}工作区 · 工具、资料与工程判断连接在一起</span></footer>
  </div>;
}
function WorkspaceVisual({ id }: { id: ModuleId }) {
  const [selected, setSelected] = useState(0);
  if (id === 'epitaxy') return <div className="epi-visual"><div className="epi-stack">{['外延层 / EPILAYER', '缓冲层 / BUFFER', '衬底 / SUBSTRATE'].map((name, i) => <button key={name} className={'epi-layer epi-layer-' + i + (selected === i ? ' selected' : '')} onClick={() => setSelected(i)}><span>{name}</span><i/></button>)}</div><div className="visual-detail"><span>关注参数</span><strong>{['厚度 · 掺杂 · 均匀性', '过渡结构 · 缺陷控制', '晶向 · 电阻率 · 材料质量'][selected]}</strong></div></div>;
  if (id === 'process') return <div className="process-visual"><div className="process-nodes">{['光刻', '注入', '热处理', '刻蚀', '金属化', '检测'].map((name, i) => <button key={name} className={selected === i ? 'selected' : ''} onClick={() => setSelected(i)}><span>STEP 0{i + 1}</span><strong>{name}</strong><i/></button>)}</div><div className="visual-detail"><span>关键控制点</span><strong>{['对准精度 · 图形尺寸', '剂量 · 能量 · 倾角', '温度 · 时间 · 气氛', '深度 · 选择比 · 均匀性', '膜厚 · 接触 · 附着性', '量测条件 · 一致性'][selected]}</strong></div></div>;
  if (id === 'design') return <div className="design-visual"><div className="visual-segment" role="group" aria-label="设计示意切换">{['结构', '仿真', '版图'].map((name, i) => <button key={name} aria-pressed={selected === i} onClick={() => setSelected(i)}>{name}</button>)}</div><svg viewBox="0 0 460 220" role="img" aria-label={['器件截面概念示意', '参数扫描概念示意', '重复单元版图概念示意'][selected]}>{selected === 0 ? <g><rect x="50" y="65" width="360" height="120" fill="#697ac6" opacity=".12"/><rect x="50" y="165" width="360" height="20" fill="#697ac6" opacity=".3"/>{[85,185,285].map(x => <g key={x}><rect x={x} y="40" width="70" height="35" rx="3" fill="#a5b4fc"/><rect x={x+20} y="76" width="30" height="45" rx="3" fill="#697ac6"/><path d={`M${x-10} 85 v55 h90 v-55`} fill="none" stroke="#8997d5" strokeWidth="2"/></g>)}<text x="230" y="210" textAnchor="middle">CELL STRUCTURE / 截面示意</text></g> : selected === 1 ? <g><path d="M50 25v160h360" fill="none" stroke="#8997d5"/>{[0,20,40].map((v,i) => <path key={v} d={`M55 180 Q${190+v} ${180-v} 220 ${100-v} T400 ${40-v/2}`} fill="none" stroke="#697ac6" strokeWidth="3" opacity={1-i*.25}/>)}<text x="230" y="210" textAnchor="middle">PARAMETER SWEEP / 趋势示意</text></g> : <g>{Array.from({length: 24}, (_,i) => <g key={i}><rect x={62+i%8*43} y={24+Math.floor(i/8)*53} width="32" height="42" rx="4" fill="#697ac6" opacity=".16"/><rect x={72+i%8*43} y={30+Math.floor(i/8)*53} width="12" height="30" rx="2" fill="none" stroke="#697ac6"/></g>)}<text x="230" y="210" textAnchor="middle">CELL ARRAY / 排布示意</text></g>}</svg></div>;
  return <div className="validation-visual"><div className="validation-matrix">{['静态电性', '动态开关', '热特性', '可靠性'].map((name,i) => <button key={name} onClick={() => setSelected(i)} className={selected === i ? 'selected' : ''}><span>{['I–V','Eon / Eoff','Zth','LIFETIME'][i]}</span><strong>{name}</strong><ShieldCheck size={20}/></button>)}</div><div className="visual-detail"><span>需要的证据</span><strong>{['测试条件 · IV / CV 曲线', '测试电路 · 原始开关波形', '功耗条件 · 温升与时间数据', '应力条件 · 样本与失效记录'][selected]}</strong></div></div>;
}
