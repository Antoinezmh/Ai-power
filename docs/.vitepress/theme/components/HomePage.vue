<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useScrollReveal } from '../composables/useScrollReveal'

const hero = useScrollReveal({ threshold: 0.05, rootMargin: '0px', initial: true })
// 页面上下滚动时重复触发，让每个区块进入视口都有自然的出现动画。
const revealOptions = { once: false, threshold: 0.08 }
const caps = useScrollReveal(revealOptions)
const pipe = useScrollReveal(revealOptions)
const ai = useScrollReveal(revealOptions)
const prin = useScrollReveal(revealOptions)
const cta = useScrollReveal(revealOptions)

const metrics = [
  { v: '28', l: '个工具' },
  { v: '4', l: '大模块' },
  { v: '7', l: '个 Gate' },
  { v: '12+', l: '工程师共建' },
]

const capabilities = [
  { num: '01', icon: '⏚', name: '规格', en: 'SPEC', desc: '从客户需求到参数表 从 FoM 到热阻折估算', href: '/capabilities#spec' },
  { num: '02', icon: '◬', name: '建模', en: 'MODEL', desc: 'TCAD 参数校准 SPICE 子电路提取 corner / Monte Carlo', href: '/capabilities#model' },
  { num: '03', icon: '◐', name: '测试', en: 'TEST', desc: 'SOA 自动绘制 双脉冲损耗 瞬态热阻拟合与 binning', href: '/capabilities#test' },
  { num: '04', icon: '⌖', name: '可靠性', en: 'RELIABILITY', desc: 'HTOL/HTRB 监测 功率循环寿命预测 样本预警', href: '/capabilities#reliability' },
]

const gates = [
  { id: 'G0', name: '规格', tools: 3 },
  { id: 'G1', name: '建模', tools: 5 },
  { id: 'G2', name: '版图', tools: 4 },
  { id: 'G3', name: '工艺', tools: 2, pending: true },
  { id: 'G4', name: '测试', tools: 7 },
  { id: 'G5', name: '可靠性', tools: 4 },
  { id: 'G6', name: '量产', tools: 1, pending: true },
]

const principles = [
  { num: '01', title: '工具化', desc: '复杂计算改为一行命令 每次复现都得到同一个答案' },
  { num: '02', title: '符号与证据', desc: '所有结果附带入参与脚本 决策可回溯 可审阅' },
  { num: '03', title: '工程化', desc: '7 个阶段 多 Gate 逐步签核' },
]

const aipts = [
  { k: '工具调用', d: '直接打开 MOSFET FoM / SOA 绘制 / 寄生提取等工具' },
  { k: '文档检索', d: '引用部门技术报告、datasheet、SOP' },
  { k: '可追溯', d: '每次回答附计算脚本与数据来源' },
]

const scrolled = ref(false)
const onScroll = () => { scrolled.value = window.scrollY > 80 }
onMounted(() => window.addEventListener('scroll', onScroll, { passive: true }))
onUnmounted(() => window.removeEventListener('scroll', onScroll))
</script>

<template>
  <div class="hp">
    <!-- ============== HERO + METRICS ============== -->
    <section
      class="hp-section hp-section--hero"
      :class="{ 'is-in-view': hero.isInView }"
      data-section="hero"
      :ref="(el) => hero.setRef(el)"
    >
      <div class="hp-bg" />
      <div class="hp-inner hp-inner--hero">
        <div class="hp-hero-top">
          <div class="hp-eyebrow">AI POWER</div>
          <h1 class="hp-mega">Built for power</h1>
          <h2 class="hp-cn">为功率器件而生</h2>
          <p class="hp-tag">
            一个工具台 一个 AI 助手 一套部门流程<br />
            <span class="hp-tag-thin">MOSFET · IGBT · SiC · GaN — 从规格到量产</span>
          </p>
          <div class="hp-cta">
            <a class="hp-btn primary" href="/login">登录工具台</a>
            <a class="hp-btn ghost" href="/capabilities">了解能力</a>
          </div>
        </div>
        <div class="hp-metrics">
          <div v-for="m in metrics" :key="m.l" class="m">
            <span class="v">{{ m.v }}</span>
            <span class="l">{{ m.l }}</span>
          </div>
        </div>
        <div class="aip-scroll-hint" aria-hidden="true">
          <span>scroll</span>
          <span class="arrow" />
        </div>
      </div>
    </section>

    <!-- ============== CAPABILITIES ============== -->
    <section
      class="hp-section"
      :class="{ 'is-in-view': caps.isInView }"
      data-section="capabilities"
      :ref="(el) => caps.setRef(el)"
    >
      <div class="hp-bg" />
      <div class="hp-inner hp-inner--capabilities">
        <div class="hp-sechead">
          <div class="hp-eyebrow">CAPABILITIES</div>
          <h3 class="hp-display">四个能力模块</h3>
          <p class="hp-sub">从 datasheet 到现场失效率 一个平台跑完整个研发链路</p>
        </div>
        <div class="hp-cap-grid">
          <a v-for="c in capabilities" :key="c.num" class="hp-cap" :href="c.href">
            <span class="hp-cap-icon">{{ c.icon }}</span>
            <span class="hp-cap-num">{{ c.num }}</span>
            <span class="hp-cap-name">{{ c.name }}</span>
            <span class="hp-cap-en">{{ c.en }}</span>
            <p class="hp-cap-desc">{{ c.desc }}</p>
            <span class="hp-cap-link">查看</span>
          </a>
        </div>
      </div>
    </section>

    <!-- ============== AI ASSISTANT — 差异化亮点提前展示 ============== -->
    <section
      class="hp-section"
      :class="{ 'is-in-view': ai.isInView }"
      data-section="ai"
      :ref="(el) => ai.setRef(el)"
    >
      <div class="hp-bg" />
      <div class="hp-inner">
        <div class="hp-split">
          <div class="hp-split-text">
            <div class="hp-eyebrow">AI ASSISTANT</div>
            <h3 class="hp-display hp-display--split">你身边的功率器件<br />AI 助手</h3>
            <p class="hp-sub hp-sub--left">
              对话即用 调用工具 查阅文档 从 FoM 估算到 SPICE 提取 从失效归因到寿命预测 工程师常用的计算和查阅 现在一句话就能完成
            </p>
            <ul class="hp-ai-pts">
              <li v-for="p in aipts" :key="p.k">
                <strong>{{ p.k }}</strong>
                <span>{{ p.d }}</span>
              </li>
            </ul>
            <div class="hp-cta hp-cta--left">
              <a class="hp-btn primary" href="/login">试用 AI 助手</a>
            </div>
          </div>
          <div class="hp-split-mock">
            <div class="hp-mock" role="img" aria-label="Ai Power 助手示例">
              <div class="hp-mock-head">
                <span class="hp-mock-dot r" /><span class="hp-mock-dot y" /><span class="hp-mock-dot g" />
                <span class="hp-mock-title">Ai Power 助手</span>
                <span class="hp-mock-badge">BETA</span>
              </div>
              <div class="hp-mock-body">
                <div class="msg assistant">
                  <div class="av">AI</div>
                  <div class="bubble">你好 我是 Ai Power 助手 问任何关于功率器件设计的问题</div>
                </div>
                <div class="msg user">
                  <div class="av">你</div>
                  <div class="bubble">帮我算下 650V SiC MOSFET 的 Ron,sp</div>
                </div>
                <div class="msg assistant">
                  <div class="av">AI</div>
                  <div class="bubble">
                    Ron,sp = R<sub>DS(on)</sub> × A<sub>cell</sub><br /><br />
                    若 A<sub>cell</sub>=0.1 cm² R<sub>DS(on)</sub>=85 mΩ 则 Ron,sp ≈ <strong>8.5 mΩ·cm²</strong><br /><br />
                    <span class="hp-mock-tool">调用工具 · MOSFET FoM 跨电压档对照</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ============== PIPELINE ============== -->
    <section
      class="hp-section"
      :class="{ 'is-in-view': pipe.isInView }"
      data-section="pipeline"
      :ref="(el) => pipe.setRef(el)"
    >
      <div class="hp-bg" />
      <div class="hp-inner">
        <div class="hp-sechead">
          <div class="hp-eyebrow">PIPELINE</div>
          <h3 class="hp-display">从规格到量产 7 个 Gate</h3>
          <p class="hp-sub">每个阶段挂载相关工具 每个 Gate 都有明确的准出条件</p>
        </div>
        <div class="hp-pipe">
          <template v-for="(g, i) in gates" :key="g.id">
            <div class="hp-pipe-step" :class="{ pending: g.pending }">
              <div class="gate-id">{{ g.id }}</div>
              <div class="gate-name">{{ g.name }}</div>
              <div class="gate-tools">{{ g.pending ? '补全中' : `${g.tools} 个工具` }}</div>
            </div>
            <span v-if="i < gates.length - 1" class="hp-pipe-arrow" aria-hidden="true">→</span>
          </template>
        </div>
      </div>
    </section>

    <!-- ============== PRINCIPLES ============== -->
    <section
      class="hp-section"
      :class="{ 'is-in-view': prin.isInView }"
      data-section="principles"
      :ref="(el) => prin.setRef(el)"
    >
      <div class="hp-bg" />
      <div class="hp-inner">
        <div class="hp-sechead">
          <div class="hp-eyebrow">PRINCIPLES</div>
          <h3 class="hp-display">三个工作原则</h3>
          <p class="hp-sub">部门所有工具与流程遵循的基本原则</p>
        </div>
        <div class="hp-prin-grid">
          <div v-for="p in principles" :key="p.num" class="hp-prin">
            <div class="p-num">{{ p.num }}</div>
            <div class="p-title">{{ p.title }}</div>
            <p class="p-desc">{{ p.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ============== CTA ============== -->
    <section
      class="hp-section hp-section--cta"
      :class="{ 'is-in-view': cta.isInView }"
      data-section="cta"
      :ref="(el) => cta.setRef(el)"
    >
      <div class="hp-bg" />
      <div class="hp-inner">
        <div class="hp-cta-card">
          <div class="hp-eyebrow">START</div>
          <h3 class="hp-display">准备好了吗</h3>
          <p class="hp-cta-sub">登录后即可使用工具台 嵌入式小程序与 AI 助手</p>
          <div class="hp-cta">
            <a class="hp-btn primary" href="/login">使用部门账号登录</a>
            <a class="hp-btn ghost" href="mailto:aipower@company.local">联系部门</a>
          </div>
        </div>
      </div>
    </section>

    <footer class="hp-footer">
      <div>© 2026 功率器件研发部 · 内部资料 · 仅限部门同事访问</div>
      <div>v1.0.0 · 反馈：<a href="mailto:aipower@company.local">aipower@company.local</a></div>
    </footer>

  </div>
</template>

<style scoped>
/* =========================================================
   HomePage — Apple-inspired scroll-driven full-screen sections
   ========================================================= */
.hp {
  background: var(--aip-bg-base);
  color: var(--aip-text-primary);
  font-family: var(--aip-font-ui);
  -webkit-font-smoothing: antialiased;
}

/* =========================================================
   Section — full viewport, scroll-driven reveal
   ========================================================= */
.hp-section {
  position: relative;
  width: 100%;
  min-height: 100vh;
  min-height: 100svh;
  display: grid;
  place-items: center;
  overflow: hidden;
  /* padding 跟随 viewport 缩放，让内容占满中间区域 */
  padding: clamp(40px, 5vh, 80px) clamp(16px, 2.5vw, 56px);
  isolation: isolate;
}

/* Background — cross-fades between sections via IntersectionObserver */
.hp-bg {
  position: absolute;
  inset: 0;
  z-index: -1;
  background: var(--aip-bg-base);
  pointer-events: none;
  opacity: 0;
  transition: opacity 700ms var(--aip-ease-out);
}
/* 统一背景为白色，去掉所有深色色块（之前 alt 类的 #F5F5F7 在浅色下显得突兀）。
   section 之间用 hairline border 微妙分隔。 */
.hp-bg {
  background: var(--aip-bg-base);
}
.hp-section + .hp-section { border-top: 1px solid var(--aip-border-subtle); }
.hp-section.is-in-view .hp-bg { opacity: 1; }

/* Inner content container — centered column, viewport-aware width
   设计原则：
   - 不卡死 max-width，让内容跟随 viewport 拉伸
   - 下限 1100，上限拉宽到 2000让大屏不中间留空
   - 内容始终是 section 的中间部分，左右等距 */
.hp-inner {
  position: relative;
  z-index: 1;
  width: 100%;
  /* 大屏不要无限横向拉伸，控制内容密度和左右留白的平衡。 */
  max-width: min(1440px, calc(100vw - clamp(48px, 8vw, 160px)));
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: clamp(24px, 4vh, 56px);
  text-align: center;
}

/* 能力模块需要更宽的横向排布，避免卡片内容被压窄后变成长条。 */
.hp-inner--capabilities {
  max-width: min(1520px, calc(100vw - clamp(48px, 6vw, 120px)));
}

/* 超宽显示器上略微增加内容宽度，但不让卡片被拉得过松。 */
@media (min-width: 1680px) {
  .hp-inner { max-width: 1480px; }
}

/* Content reveal — IntersectionObserver triggers this */
.hp-inner > * {
  opacity: 0;
  transform: translateY(56px);
  filter: blur(6px);
  transition:
    opacity   800ms var(--aip-ease-out),
    transform 800ms var(--aip-ease-out),
    filter    800ms var(--aip-ease-out);
  will-change: opacity, transform, filter;
}

.hp-section.is-in-view .hp-inner > * {
  opacity: 1;
  transform: translateY(0);
  filter: blur(0);
}

/* 轻微的景深感，让下拉时内容从页面中自然浮现。 */
.hp-section:not(.is-in-view) .hp-sechead,
.hp-section:not(.is-in-view) .hp-split-text,
.hp-section:not(.is-in-view) .hp-split-mock {
  transform: translateY(28px) scale(0.985);
}

/* Stagger children — each waits an extra 90ms after the previous */
.hp-section.is-in-view .hp-inner > *:nth-child(1) { transition-delay: 0ms;   }
.hp-section.is-in-view .hp-inner > *:nth-child(2) { transition-delay: 90ms;  }
.hp-section.is-in-view .hp-inner > *:nth-child(3) { transition-delay: 180ms; }
.hp-section.is-in-view .hp-inner > *:nth-child(4) { transition-delay: 270ms; }
.hp-section.is-in-view .hp-inner > *:nth-child(5) { transition-delay: 360ms; }
.hp-section.is-in-view .hp-inner > *:nth-child(6) { transition-delay: 450ms; }
.hp-section.is-in-view .hp-inner > *:nth-child(7) { transition-delay: 540ms; }

/* Pipelines / grids — reveal inner items too */
.hp-section.is-in-view .hp-cap,
.hp-section.is-in-view .hp-pipe-step,
.hp-section.is-in-view .hp-prin,
.hp-section.is-in-view .hp-mock-body .msg,
.hp-section.is-in-view .hp-metrics .m {
  opacity: 0;
  transform: translateY(24px);
  animation: hp-stagger-in 600ms var(--aip-ease-out) forwards;
}
.hp-section.is-in-view .hp-cap:nth-child(1)         { animation-delay: 200ms; }
.hp-section.is-in-view .hp-cap:nth-child(2)         { animation-delay: 290ms; }
.hp-section.is-in-view .hp-cap:nth-child(3)         { animation-delay: 380ms; }
.hp-section.is-in-view .hp-cap:nth-child(4)         { animation-delay: 470ms; }
.hp-section.is-in-view .hp-pipe-step:nth-child(odd){ animation-delay: 220ms; }
.hp-section.is-in-view .hp-pipe-step:nth-child(even){ animation-delay: 320ms; }
.hp-section.is-in-view .hp-prin:nth-child(1)        { animation-delay: 200ms; }
.hp-section.is-in-view .hp-prin:nth-child(2)        { animation-delay: 310ms; }
.hp-section.is-in-view .hp-prin:nth-child(3)        { animation-delay: 420ms; }
.hp-section.is-in-view .hp-mock-body .msg:nth-child(1){ animation-delay: 360ms; }
.hp-section.is-in-view .hp-mock-body .msg:nth-child(2){ animation-delay: 480ms; }
.hp-section.is-in-view .hp-mock-body .msg:nth-child(3){ animation-delay: 600ms; }
.hp-section.is-in-view .hp-metrics .m:nth-child(1)  { animation-delay: 520ms; }
.hp-section.is-in-view .hp-metrics .m:nth-child(2)  { animation-delay: 580ms; }
.hp-section.is-in-view .hp-metrics .m:nth-child(3)  { animation-delay: 640ms; }
.hp-section.is-in-view .hp-metrics .m:nth-child(4)  { animation-delay: 700ms; }

@keyframes hp-stagger-in {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Pipeline arrows fade in last */
.hp-section.is-in-view .hp-pipe-arrow {
  animation: hp-arrow-in 400ms var(--aip-ease-out) 480ms forwards;
  opacity: 0;
}
@keyframes hp-arrow-in {
  from { opacity: 0; transform: translateX(-4px); }
  to   { opacity: 1; transform: translateX(0); }
}

/* =========================================================
   HERO — special layout: top text + bottom metrics
   ========================================================= */
.hp-inner--hero {
  height: 100%;
  justify-content: space-between;
  padding: 32px 0 24px;
}
.hp-hero-top {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  max-width: 920px;
}

/* =========================================================
   Typography
   ========================================================= */
.hp-eyebrow {
  font-family: var(--aip-font-mono);
  font-size: var(--aip-fs-sm);
  letter-spacing: 0.20em;
  text-transform: uppercase;
  color: var(--aip-text-secondary);
  margin-bottom: 4px;
}
.hp-mega {
  font-size: var(--aip-fs-mega);
  font-weight: 600;
  letter-spacing: -0.045em;
  line-height: 0.95;
  margin: 0;
  color: var(--aip-text-primary);
  background: linear-gradient(180deg, var(--aip-text-primary) 0%, var(--aip-text-secondary) 110%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.hp-cn {
  font-size: var(--aip-fs-xl);
  font-weight: 500;
  letter-spacing: -0.015em;
  margin: 0;
  color: var(--aip-text-secondary);
}
.hp-tag {
  font-size: var(--aip-fs-md);
  line-height: 1.55;
  color: var(--aip-text-secondary);
  margin: 0;
  max-width: 640px;
}
.hp-tag-thin {
  color: var(--aip-text-tertiary);
  font-family: var(--aip-font-mono);
  font-size: var(--aip-fs-sm);
  letter-spacing: 0.02em;
}

.hp-display {
  font-size: var(--aip-fs-4xl);
  font-weight: 600;
  letter-spacing: -0.03em;
  line-height: 1.05;
  color: var(--aip-text-primary);
  margin: 0;
}
.hp-display--split { text-align: left; font-size: var(--aip-fs-3xl); }
.hp-sub {
  font-size: var(--aip-fs-md);
  color: var(--aip-text-secondary);
  line-height: 1.55;
  margin: 0;
  max-width: 640px;
}
.hp-sub--left { text-align: left; margin: 0; }

.hp-sechead {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

/* =========================================================
   CTA buttons
   ========================================================= */
.hp-cta {
  display: inline-flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}
.hp-cta--left { justify-content: flex-start; }
.hp-btn {
  display: inline-flex;
  align-items: center;
  padding: 14px 28px;
  border-radius: var(--aip-radius-pill);
  font-size: var(--aip-fs-base);
  font-weight: 500;
  text-decoration: none;
  letter-spacing: -0.01em;
  border: 1px solid transparent;
  transition: all var(--aip-dur-base) var(--aip-ease-out);
  cursor: pointer;
  font-family: var(--aip-font-ui);
}
.hp-btn.primary {
  background: var(--aip-text-primary);
  color: #FFFFFF;
  border-color: var(--aip-text-primary);
}
.hp-btn.primary:hover { background: #000000; border-color: #000000; }
.hp-btn.ghost {
  background: transparent;
  color: var(--aip-text-primary);
  border-color: var(--aip-border);
}
.hp-btn.ghost:hover {
  background: var(--aip-text-primary);
  color: #FFFFFF;
  border-color: var(--aip-text-primary);
}

/* =========================================================
   Metrics
   ========================================================= */
.hp-metrics {
  display: flex;
  justify-content: center;
  align-items: baseline;
  gap: 64px;
  padding: 24px 32px;
  border-top: 1px solid var(--aip-border-subtle);
  border-bottom: 1px solid var(--aip-border-subtle);
  width: 100%;
  max-width: 960px;
}
.hp-metrics .m {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
  min-width: 110px;
}
.hp-metrics .v {
  font-size: var(--aip-fs-3xl);
  font-weight: 600;
  letter-spacing: -0.025em;
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
  color: var(--aip-text-primary);
}
.hp-metrics .l {
  font-family: var(--aip-font-mono);
  font-size: var(--aip-fs-xs);
  color: var(--aip-text-secondary);
  letter-spacing: 0.06em;
}

/* =========================================================
   Scroll hint (under hero metrics)
   ========================================================= */
.aip-scroll-hint {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: var(--aip-text-tertiary);
  font-family: var(--aip-font-mono);
  font-size: 10px;
  letter-spacing: 0.20em;
  text-transform: uppercase;
}
.aip-scroll-hint .arrow {
  width: 1px;
  height: 32px;
  background: linear-gradient(to bottom, var(--aip-text-tertiary), transparent);
  animation: aip-scroll-pulse 2.4s infinite;
}
@keyframes aip-scroll-pulse {
  0%   { opacity: 0.3; transform: translateY(-4px); }
  50%  { opacity: 1;   transform: translateY(0); }
  100% { opacity: 0.3; transform: translateY(4px); }
}

/* =========================================================
   Capabilities grid
   4 个能力模块均分宽度，按 viewport 调整：
   - 4 等分，卡片占满整个 inner 宽度
   - gap 跟随 viewport
   ========================================================= */
.hp-cap-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: clamp(12px, 1.2vw, 24px);
  width: 100%;
}
.hp-cap {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: clamp(24px, 3.5vh, 48px) clamp(20px, 2.2vw, 36px) clamp(20px, 3vh, 36px);
  min-width: 0;
  background: var(--aip-bg-elevated);
  border: 1px solid var(--aip-border-subtle);
  border-radius: var(--aip-radius-xl);
  text-decoration: none;
  color: inherit;
  transition: border-color var(--aip-dur-base) var(--aip-ease-out),
              transform var(--aip-dur-base) var(--aip-ease-out);
}
.hp-cap:hover {
  border-color: var(--aip-text-primary);
  transform: translateY(-4px);
}
.hp-cap-icon {
  font-family: var(--aip-font-mono);
  font-size: 28px;
  color: var(--aip-text-primary);
}
.hp-cap-num {
  font-family: var(--aip-font-mono);
  font-size: var(--aip-fs-xs);
  color: var(--aip-text-tertiary);
  letter-spacing: 0.10em;
}
.hp-cap-name {
  font-size: var(--aip-fs-xl);
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--aip-text-primary);
  white-space: nowrap;
}
.hp-cap-en {
  font-family: var(--aip-font-mono);
  font-size: var(--aip-fs-xs);
  color: var(--aip-text-tertiary);
  letter-spacing: 0.10em;
}
.hp-cap-desc {
  font-size: var(--aip-fs-sm);
  color: var(--aip-text-secondary);
  line-height: 1.6;
  margin: 8px 0 0;
}
.hp-cap-link {
  font-family: var(--aip-font-mono);
  font-size: var(--aip-fs-xs);
  color: var(--aip-text-link);
  margin-top: auto;
  padding-top: 16px;
  letter-spacing: 0.02em;
}

/* =========================================================
   Pipeline
   ========================================================= */
.hp-pipe {
  display: flex;
  align-items: stretch;
  gap: 0;
  width: 100%;
  flex-wrap: wrap;
  justify-content: center;
}
.hp-pipe-step {
  flex: 1;
  min-width: 130px;
  padding: 24px 16px;
  background: var(--aip-bg-elevated);
  border: 1px solid var(--aip-border-subtle);
  border-right: none;
  text-align: center;
  transition: border-color var(--aip-dur-fast) var(--aip-ease-out);
}
.hp-pipe-step:last-of-type { border-right: 1px solid var(--aip-border-subtle); }
.hp-pipe-step:hover { border-color: var(--aip-text-primary); }
.hp-pipe-step.pending {
  background: rgba(0, 0, 0, 0.02);
  border-style: dashed;
  color: var(--aip-text-tertiary);
}
.hp-pipe-step .gate-id {
  font-family: var(--aip-font-mono);
  font-size: var(--aip-fs-sm);
  color: var(--aip-text-tertiary);
  font-weight: 500;
  margin-bottom: 8px;
  letter-spacing: 0.08em;
}
.hp-pipe-step .gate-name {
  font-size: var(--aip-fs-base);
  font-weight: 600;
  margin-bottom: 4px;
  color: var(--aip-text-primary);
  letter-spacing: -0.01em;
}
.hp-pipe-step.pending .gate-name { color: var(--aip-text-tertiary); }
.hp-pipe-step .gate-tools {
  font-family: var(--aip-font-mono);
  font-size: var(--aip-fs-xs);
  color: var(--aip-text-secondary);
}
.hp-pipe-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  color: var(--aip-text-tertiary);
  font-family: var(--aip-font-mono);
  font-size: var(--aip-fs-md);
}

/* =========================================================
   AI Split
   ========================================================= */
.hp-split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 64px;
  align-items: center;
  width: 100%;
}
.hp-split-text {
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 20px;
  align-items: flex-start;
}
.hp-split-text .hp-eyebrow { text-align: left; }
.hp-ai-pts {
  list-style: none;
  padding: 0;
  margin: 8px 0 0;
  display: flex;
  flex-direction: column;
  gap: 0;
  width: 100%;
}
.hp-ai-pts li {
  display: flex;
  align-items: baseline;
  gap: 16px;
  font-size: var(--aip-fs-sm);
  color: var(--aip-text-secondary);
  padding: 14px 0;
  border-bottom: 1px solid var(--aip-border-subtle);
}
.hp-ai-pts li:first-child { border-top: 1px solid var(--aip-border-subtle); }
.hp-ai-pts li strong {
  font-family: var(--aip-font-mono);
  font-size: var(--aip-fs-xs);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--aip-text-primary);
  min-width: 96px;
  flex-shrink: 0;
}

.hp-split-mock { display: flex; justify-content: center; }
.hp-mock {
  width: 100%;
  max-width: 460px;
  background: var(--aip-bg-elevated);
  border: 1px solid var(--aip-border-subtle);
  border-radius: var(--aip-radius-xl);
  overflow: hidden;
}
.hp-mock-head {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 16px;
  background: rgba(0, 0, 0, 0.02);
  border-bottom: 1px solid var(--aip-border-subtle);
}
.hp-mock-dot {
  width: 10px; height: 10px; border-radius: 50%;
  background: var(--aip-border);
}
.hp-mock-dot.r { background: #FF5F57; }
.hp-mock-dot.y { background: #FEBC2E; }
.hp-mock-dot.g { background: #28C840; }
.hp-mock-title {
  font-family: var(--aip-font-mono);
  font-size: var(--aip-fs-xs);
  color: var(--aip-text-secondary);
  margin-left: 8px;
}
.hp-mock-badge {
  margin-left: auto;
  font-family: var(--aip-font-mono);
  font-size: 9px;
  background: rgba(255, 159, 10, 0.10);
  color: var(--aip-warn);
  padding: 2px 6px;
  border-radius: var(--aip-radius-xs);
  letter-spacing: 0.06em;
}
.hp-mock-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: var(--aip-bg-base);
}
.hp-mock-body .msg { display: flex; gap: 8px; align-items: flex-start; }
.hp-mock-body .msg.user { flex-direction: row-reverse; }
.hp-mock-body .av {
  width: 24px; height: 24px; flex-shrink: 0;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: var(--aip-radius-sm);
  font-family: var(--aip-font-mono);
  font-size: 10px;
  border: 1px solid var(--aip-border-subtle);
  color: var(--aip-text-secondary);
  background: rgba(0, 0, 0, 0.02);
}
.hp-mock-body .msg.user .av {
  background: rgba(0, 102, 204, 0.04);
  color: var(--aip-text-link);
  border-color: rgba(0, 102, 204, 0.30);
}
.hp-mock-body .msg.assistant .av {
  background: var(--aip-text-primary);
  color: #FFFFFF;
  border-color: var(--aip-text-primary);
  font-weight: 600;
}
.hp-mock-body .bubble {
  background: rgba(0, 0, 0, 0.02);
  border: 1px solid var(--aip-border-subtle);
  border-radius: var(--aip-radius-md);
  padding: 12px 14px;
  max-width: 80%;
  font-size: var(--aip-fs-sm);
  line-height: 1.55;
  color: var(--aip-text-primary);
}
.hp-mock-body .msg.user .bubble {
  background: rgba(0, 102, 204, 0.04);
  border-color: rgba(0, 102, 204, 0.25);
}
.hp-mock-tool {
  display: inline-block;
  margin-top: 8px;
  padding: 4px 8px;
  font-family: var(--aip-font-mono);
  font-size: var(--aip-fs-xs);
  color: var(--aip-text-link);
  border: 1px solid rgba(0, 102, 204, 0.30);
  border-radius: var(--aip-radius-xs);
  background: rgba(0, 102, 204, 0.06);
}

/* =========================================================
   Principles
   ========================================================= */
.hp-prin-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  width: 100%;
  max-width: 1080px;
}
.hp-prin {
  padding: 32px;
  background: var(--aip-bg-elevated);
  border: 1px solid var(--aip-border-subtle);
  border-radius: var(--aip-radius-lg);
  display: flex;
  flex-direction: column;
  gap: 12px;
  text-align: left;
}
.hp-prin .p-num {
  font-family: var(--aip-font-mono);
  font-size: var(--aip-fs-2xl);
  color: var(--aip-text-primary);
  font-weight: 500;
  letter-spacing: -0.02em;
}
.hp-prin .p-title {
  font-size: var(--aip-fs-lg);
  font-weight: 600;
  letter-spacing: -0.015em;
}
.hp-prin .p-desc {
  font-size: var(--aip-fs-sm);
  color: var(--aip-text-secondary);
  line-height: 1.6;
  margin: 0;
}

/* =========================================================
   CTA card
   ========================================================= */
.hp-cta-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  max-width: 720px;
}
.hp-section--cta {
  min-height: auto;
  padding-top: clamp(56px, 7vh, 96px);
  padding-bottom: clamp(48px, 6vh, 80px);
}
.hp-section--cta .hp-inner { gap: 0; }
.hp-cta-sub {
  font-size: var(--aip-fs-md);
  color: var(--aip-text-secondary);
  margin: 0;
}

/* =========================================================
   Footer (auto height, no scroll-driven)
   ========================================================= */
.hp-footer {
  border-top: 1px solid var(--aip-border-subtle);
  padding: 20px clamp(20px, 4vw, 48px);
  background: var(--aip-bg-base);
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  font-family: var(--aip-font-mono);
  font-size: var(--aip-fs-xs);
  color: var(--aip-text-tertiary);
}
.hp-footer a { color: var(--aip-text-link); text-decoration: none; }
.hp-footer a:hover { text-decoration: underline; }

/* =========================================================
   Responsive — adaptive viewport height
   ========================================================= */
@media (max-width: 1280px) {
  .hp-cap-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 1024px) {
  .hp-mega { font-size: var(--aip-fs-display); }
  .hp-display { font-size: var(--aip-fs-3xl); }
  .hp-prin-grid { grid-template-columns: 1fr; }
  .hp-split { grid-template-columns: 1fr; gap: 40px; }
  .hp-pipe-step { min-width: 110px; }
  .hp-metrics { gap: 40px; }
}
/* 窄桌面及平板：卡片改为单列，保证中文模块名和描述有足够空间。 */
@media (max-width: 960px) {
  .hp-cap-grid { grid-template-columns: 1fr; }
}
@media (max-width: 640px) {
  .hp-section {
    min-height: auto;          /* let content drive height on phones */
    padding: 72px 20px;
    scroll-snap-align: none;
  }
  .hp-mega { font-size: 56px; }
  .hp-cn { font-size: var(--aip-fs-lg); }
  .hp-display { font-size: var(--aip-fs-2xl); }
  .hp-cap-grid { grid-template-columns: 1fr; }
  .hp-pipe { flex-direction: column; gap: 8px; }
  .hp-pipe-step { border-right: 1px solid var(--aip-border-subtle); }
  .hp-pipe-arrow { transform: rotate(90deg); }
  .hp-metrics {
    flex-wrap: wrap;
    gap: 20px;
    padding: 16px 0;
  }
  .hp-metrics .m { min-width: 80px; }
  .hp-metrics .v { font-size: var(--aip-fs-2xl); }
  .hp-ai-pts li { flex-direction: column; align-items: flex-start; gap: 4px; }
  .hp-ai-pts li strong { min-width: 0; }
  .hp-inner--hero { padding: 16px 0 8px; gap: 32px; }
  .hp-hero-top { gap: 16px; }
  .hp-footer { flex-direction: column; gap: 8px; padding: 24px 20px; }
}

/* =========================================================
   Subtle scroll snap (desktop only) — gives the "page turn" feel
   ========================================================= */
@media (min-width: 1025px) {
  html { scroll-behavior: smooth; }
}

@media (prefers-reduced-motion: reduce) {
  .hp-section,
  .hp-inner > *,
  .hp-section.is-in-view .hp-cap,
  .hp-section.is-in-view .hp-pipe-step,
  .hp-section.is-in-view .hp-prin,
  .hp-section.is-in-view .hp-mock-body .msg,
  .hp-section.is-in-view .hp-metrics .m,
  .hp-section.is-in-view .hp-pipe-arrow {
    animation: none !important;
    transition: none !important;
    transform: none !important;
    filter: none !important;
    opacity: 1 !important;
  }
}
</style>
