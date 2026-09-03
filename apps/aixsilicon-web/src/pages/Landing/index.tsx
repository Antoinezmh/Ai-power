import { useEffect, useRef } from 'react';
import { ArrowRight, Bot, Cpu, FlaskConical, Gauge, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '@/features/auth/stores/authStore';
import './landing.css';

const capabilities = [
  { icon: Cpu, number: '01', title: '规格', en: 'SPEC', desc: '从客户需求到参数表，从 FoM 到热阻折算。', href: '/capabilities/spec' },
  { icon: Gauge, number: '02', title: '建模', en: 'MODEL', desc: 'TCAD 参数校准与 SPICE 子电路提取。', href: '/capabilities/model' },
  { icon: FlaskConical, number: '03', title: '测试', en: 'TEST', desc: 'SOA、双脉冲损耗与瞬态热阻分析。', href: '/capabilities/test' },
  { icon: ShieldCheck, number: '04', title: '可靠性', en: 'RELIABILITY', desc: '老化试验、寿命预测与样本预警。', href: '/capabilities/reliability' },
];

const gates = ['G0 规格', 'G1 建模', 'G2 版图', 'G3 工艺', 'G4 测试', 'G5 可靠性', 'G6 量产'];

export default function Landing() {
  const pageRef = useRef<HTMLDivElement>(null);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const workbenchHref = isAuthenticated ? '/dashboard' : '/login?redirect=%2Fdashboard';

  useEffect(() => {
    const root = pageRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      entries => entries.forEach(entry => entry.isIntersecting && entry.target.classList.add('is-visible')),
      { threshold: 0.12 }
    );
    root.querySelectorAll('.landing-reveal').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={pageRef} className="landing-page">
      <header className="landing-nav">
        <a href="/" className="landing-brand"><span className="brand-mark">⌁</span><span>Ai Power</span></a>
        <nav><a href="#capabilities">能力</a><a href="#pipeline">流程</a><a href="#about">关于</a></nav>
        <a href={workbenchHref} className="landing-login">{isAuthenticated ? '进入工作台' : '登录'} <ArrowRight size={15} /></a>
      </header>

      <main>
        <section className="landing-hero landing-reveal is-visible">
          <div className="eyebrow">AI POWER · POWER DEVICE AI PLATFORM</div>
          <h1>Built for power</h1>
          <h2>为功率器件而生</h2>
          <p>一个工具台，一个 AI 助手，一套部门流程。<br /><span>MOSFET · IGBT · SiC · GaN — 从规格到量产</span></p>
          <div className="landing-actions"><a className="button primary" href={workbenchHref}>进入工作台 <ArrowRight size={16} /></a><a className="button secondary" href="#capabilities">了解能力</a></div>
          <div className="metrics"><div><strong>28</strong><span>个工具</span></div><div><strong>4</strong><span>大模块</span></div><div><strong>7</strong><span>个 Gate</span></div><div><strong>12+</strong><span>工程师共建</span></div></div>
        </section>

        <section id="capabilities" className="landing-section landing-reveal">
          <div className="section-heading"><div className="eyebrow">CAPABILITIES</div><h3>四个能力模块</h3><p>从 datasheet 到现场失效率，一个平台跑完整个研发链路。</p></div>
          <div className="capability-grid">{capabilities.map(({ icon: Icon, ...item }) => <a className="capability-card" href={item.href} key={item.number}><Icon size={24} strokeWidth={1.5} /><span className="card-number">{item.number}</span><h4>{item.title}</h4><small>{item.en}</small><p>{item.desc}</p><ArrowRight className="card-arrow" size={17} /></a>)}</div>
        </section>

        <section id="pipeline" className="landing-section alt landing-reveal">
          <div className="section-heading"><div className="eyebrow">PIPELINE</div><h3>从规格到量产</h3><p>每个阶段挂载工具，每个 Gate 都有明确的准出条件。</p></div>
          <div className="pipeline">{gates.map((gate, index) => <div className="pipeline-item" key={gate}><span>{gate.slice(0, 2)}</span><strong>{gate.slice(3)}</strong>{index < gates.length - 1 && <i>→</i>}</div>)}</div>
        </section>

        <section id="about" className="landing-section landing-ai landing-reveal">
          <div><div className="eyebrow">AI ASSISTANT</div><h3>让工程经验<br />变成可调用的能力</h3><p>对话即用，调用工具，查阅文档。从 FoM 估算到失效归因，把重复工作交给 AI，把判断留给工程师。</p><a className="text-link" href={workbenchHref}>试用 AI 助手 <ArrowRight size={16} /></a></div>
          <div className="ai-preview"><div className="preview-head"><Bot size={17} /> Ai Power 助手 <span>BETA</span></div><div className="message">你好，我可以帮你查询部门文档或调用功率器件工具。</div><div className="message user">帮我算下 650V SiC MOSFET 的 Ron,sp</div><div className="message result">Ron,sp ≈ <strong>8.5 mΩ·cm²</strong><small>已调用 · MOSFET FoM Calculator</small></div></div>
        </section>

        <section className="landing-cta landing-reveal"><div className="eyebrow">START</div><h3>准备好了吗</h3><p>{isAuthenticated ? '进入工作台，继续你的研发任务。' : '登录后即可使用工具台、嵌入式小程序与 AI 助手。'}</p><a className="button primary" href={workbenchHref}>{isAuthenticated ? '进入工作台' : '使用部门账号登录'} <ArrowRight size={16} /></a></section>
      </main>

      <footer className="landing-footer"><span>© 2026 功率器件研发部 · 内部资料 · 仅限部门同事访问</span><span>v0.3 · 反馈：aipower@company.local</span></footer>
    </div>
  );
}
