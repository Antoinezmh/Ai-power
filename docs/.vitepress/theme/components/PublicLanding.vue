<script setup lang="ts">
const capabilities = [
  {
    size: 'is-1',
    icon: '⏚',
    num: '01',
    name: '规格',
    en: 'SPEC',
    desc: '从客户需求到参数表、从 FoM 到热阻折。把分散在 Excel、PDF、邮件里的规格收敛为单一来源。',
    pts: ['FoM 与 Ron,sp 多电压档', '热阻估算与瞬态折算', '参数表智能提取'],
  },
  { size: 'is-2', icon: '◬', num: '02', name: '建模', en: 'MODEL',
    desc: 'TCAD 校准 + SPICE subckt 提取 + corner/MC。', pts: [] },
  { size: 'is-3', icon: '⎞', num: '03', name: '测试', en: 'TEST',
    desc: 'SOA 自动绘制与双脉冲损耗外推。', pts: [] },
  { size: 'is-4', icon: '⌛', num: '04', name: '可靠性', en: 'RELIABILITY',
    desc: 'HTOL/HTRB 在线监测、寿命预测、预警。', pts: [] },
  { size: 'is-5', icon: '◔', num: '05', name: 'SOP', en: 'SOP',
    desc: '测试流程模板与签核清单。', pts: [] },
]

const tools = [
  'MOSFET FoM', 'SOA 绘制', 'TCAD 校准', 'Binning', 'HTOL', 'Switch Loss',
  'SPICE 提取', 'DRC Runner', 'PC Lifetime', 'Fail Decode', 'Datasheet',
  '热障折', 'Wafer Map', 'Ron,sp', 'Igbt FoM', 'Cv Plot', 'Tlp Parse',
]

const principles = [
  { num: '01', title: '工具化', desc: '所有复杂计算改为一行命令。每次复现都得到同一个答案。' },
  { num: '02', title: '符号与证据', desc: '结果附入参与脚本，决策可回溯、可审阅。' },
  { num: '03', title: '工程化', desc: '7 个阶段、多个 Gate，逐步签核。' },
]
</script>

<template>
  <div class="landing">
    <!-- ====================== HERO ====================== -->
    <section class="sec-hero">
      <div class="bg-grid" aria-hidden="true">
        <svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 1440 800">
          <defs>
            <pattern id="hp" width="48" height="48" patternUnits="userSpaceOnUse">
              <path d="M 48 0 L 0 0 48 48Z" fill="none" stroke="rgba(91,168,255,0.05)" stroke-width="1"/>
            </pattern>
            <radialGradient id="hg" cx="50%" cy="40%" r="60%">
              <stop offset="0%" stop-color="rgba(91,168,255,0.22)"/>
              <stop offset="55%" stop-color="rgba(94,234,212,0.06)"/>
              <stop offset="100%" stop-color="rgba(0,0,0,0)"/>
            </radialGradient>
          </defs>
          <rect width="1440" height="800" fill="url(#hg)"/>
          <rect width="1440" height="800" fill="url(#hp)"/>
        </svg>
      </div>

      <div class="hero-inner aip-hero-split" data-aip-stagger>
        <!-- Left: copy -->
        <div class="hero-left" data-aip-item>
          <div class="aip-hero-eyebrow-row">
            <span class="pill"><span class="pulse-dot" /> v1.0</span>
            <span>功率器件研发部门 · 内部资料 · 不对外公开</span>
          </div>
          <h1 class="aip-hero-title">
            <span class="accent">功率器件</span><br/>
            设计引擎
          </h1>
          <p class="aip-hero-sub">
            从规格到量产，为 MOSFET / IGBT / SiC / GaN 分立器件研发工程师提供一站式工具、AI 助手与嵌入式小程序。
          </p>

          <div class="hero-actions">
            <a class="aip-btn-primary lg" href="/login">立即登录 →</a>
            <a class="aip-btn-ghost lg" href="/capabilities">了解能力</a>
          </div>

          <!-- Proof strip -->
          <div class="aip-proof-strip">
            <div class="item">
              <span class="v">28</span>
              <span class="l">个工具</span>
            </div>
            <div class="item">
              <span class="v">4</span>
              <span class="l">大模块</span>
            </div>
            <div class="item">
              <span class="v">7</span>
              <span class="l">个 Gate</span>
            </div>
            <div class="item">
              <span class="v">5 min</span>
              <span class="l">从需求到使用</span>
            </div>
          </div>
        </div>

        <!-- Right: code preview -->
        <div class="hero-right" data-aip-item>
          <div class="aip-code-card">
            <div class="aip-code-card-head">
              <span class="dots"><span /><span /><span /></span>
              <span class="title">~/aipower/fom · ron,sp calc</span>
              <span class="badge">● Live</span>
            </div>
            <pre class="aip-code-card-body"><span class="c-cmt"># 部门 CLI · SiC MOSFET Ron,sp 估算</span>
<span class="c-key">$</span> aipower-fom calc \
    <span class="c-cmt">--</span>vd <span class="c-val">1200</span> \
    <span class="c-cmt">--</span>ron <span class="c-val">0.085</span> \
    <span class="c-cmt">--</span>qg <span class="c-val">35n</span> \
    <span class="c-cmt">--</span>tech <span class="c-str">"sic"</span> \
    <span class="c-cmt">--</span>node <span class="c-str">"Trench-1200V"</span>

<span class="c-cmt">┌─────────────────────────────┐</span>
<span class="c-cmt">│</span> <span class="c-key">FoM_B</span>     = <span class="c-val">0.31</span> mΩ·cm²·μJ/cm²    <span class="c-cmt">│</span>
<span class="c-cmt">│</span> <span class="c-key">Ron,sp</span>    = <span class="c-val">2.84</span> mΩ·cm²              <span class="c-cmt">│</span>
<span class="c-cmt">│</span> <span class="c-key">vs.typ</span>    = <span class="c-val">-12.4%</span> (比典型工艺)   <span class="c-cmt">│</span>
<span class="c-cmt">└─────────────────────────────┘</span>
  <span class="c-key">→</span> 报告已写入 ./out/fom_report.html</pre>
            <div class="aip-code-card-foot">
              <span class="live-dot" />
              <span>127 次调用 · 上次 12 秒前</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <div class="aip-divider" />

    <!-- ====================== CAPABILITIES (Bento) ====================== -->
    <section id="capabilities" class="sec-caps">
      <div class="aip-sec-head" data-aip-item>
        <div class="aip-eyebrow">CAPABILITIES</div>
        <h2>四大能力模块</h2>
        <p class="aip-sec-sub">覆盖功率器件研发全流程，工具 + AI 助手 + 数据驱动。</p>
      </div>

      <div class="aip-bento" data-aip-stagger>
        <article
          v-for="c in capabilities"
          :key="c.num"
          class="aip-bento-tile"
          :class="c.size"
          data-aip-item
        >
          <div class="head">
            <div class="icon">{{ c.icon }}</div>
            <div class="num">0{{ c.num }}</div>
          </div>
          <div class="name">{{ c.name }}</div>
          <div class="en">{{ c.en }}</div>
          <div class="desc">{{ c.desc }}</div>
          <ul v-if="c.pts.length" class="pts">
            <li v-for="p in c.pts" :key="p">{{ p }}</li>
          </ul>
        </article>
      </div>
    </section>

    <div class="aip-divider" />

    <!-- ====================== TOOLS (Marquee) ====================== -->
    <section class="sec-tools">
      <div class="aip-sec-head" data-aip-item>
        <div class="aip-eyebrow">TOOLBOX</div>
        <h2>部门自维护的 12+ 个工具</h2>
        <p class="aip-sec-sub">CLI / GUI / Web / Notebook / SOP 一应俱全，从规格到量产。</p>
      </div>

      <div class="aip-marquee" data-aip-item>
        <div class="aip-marquee-track">
          <span v-for="t in [...tools, ...tools]" :key="t + Math.random()" class="tool-chip"><span class="dot" /> {{ t }}</span>
        </div>
      </div>

      <div class="tools-cta" data-aip-item>
        详细工具列表、状态与命令请登录后查看 <a href="/login">登录查看 →</a>
      </div>
    </section>

    <div class="aip-divider" />

    <!-- ====================== PRINCIPLES ====================== -->
    <section class="sec-flow">
      <div class="aip-sec-head" data-aip-item>
        <div class="aip-eyebrow">PRINCIPLE</div>
        <h2>三个工作原则</h2>
        <p class="aip-sec-sub">部门所有工具与流程遵循的基本原则。</p>
      </div>

      <div class="principles" data-aip-stagger>
        <div v-for="p in principles" :key="p.num" class="principle" data-aip-item>
          <div class="p-num">{{ p.num }}</div>
          <div class="p-title">{{ p.title }}</div>
          <p class="p-desc">{{ p.desc }}</p>
        </div>
      </div>
    </section>

    <!-- ====================== CTA ====================== -->
    <section class="sec-cta">
      <div class="cta-card" data-aip-item>
        <div class="cta-mark">⏚</div>
        <h2>准备好了吗？</h2>
        <p>登录后你将拿到工具展示、嵌入小程序与 AI 助手。</p>
        <div class="cta-actions">
          <a class="aip-btn-primary lg" href="/login">使用部门账号登录 →</a>
          <a class="aip-btn-ghost lg" href="/about">联系部门</a>
        </div>
        <div class="cta-hint">默认账号：<code>demo</code> / <code>demo123</code>（仅内部演示）</div>
      </div>
    </section>

    <footer class="aip-footer">
      <div>© 2026 功率器件研发部 · 内部资料 · 不对外公开</div>
      <div>反馈：<a href="mailto:aipower@company.local">aipower@company.local</a></div>
    </footer>
  </div>
</template>