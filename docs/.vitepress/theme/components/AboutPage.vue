<script setup lang="ts">
import Tabs, { type Tab } from './Tabs.vue'

const tabs: Tab[] = [
  { key: 'what',  label: '是什么',   icon: '◯' },
  { key: 'why',   label: '为什么',   icon: '?' },
  { key: 'stack', label: '技术栈',   icon: '⌘' },
  { key: 'time',  label: '里程碑',   icon: '⌚' },
  { key: 'next',  label: '开始使用', icon: '↗' },
]

const timeline = [
  { yr: '2024 · Q1', tt: '规格工具雏形', dc: '第一个 MOSFET FoM 计算脚本上线' },
  { yr: '2024 · Q3', tt: '工具聚合', dc: 'FoM / SOA / TCAD 校准 三个工具集成到统一 CLI' },
  { yr: '2025 · Q2', tt: '内部平台上线', dc: '工具台 + AI 助手 v0.1 对内开放' },
  { yr: '2026 · Q3', tt: 'v1.0', dc: '12+ 工具接入 4 大模块覆盖规格 量产' },
]

const stack = [
  { n: 'VitePress',  v: '1.6.4', k: '前端文档与站点' },
  { n: 'Vue 3',      v: '3.5',   k: '应用组件' },
  { n: 'FastAPI',    v: '0.115', k: '后端 API' },
  { n: 'Docker',     v: '24+',   k: '容器化部署' },
  { n: 'Nginx',      v: '1.27',  k: '反向代理' },
  { n: 'Python',     v: '3.11',  k: '服务端语言' },
  { n: 'OpenAI API', v: '—',     k: 'AI 助手调用' },
]
</script>

<template>
  <div class="aip-about">
    <!-- HERO -->
    <section class="aip-about-hero">
      <div class="aip-eyebrow">ABOUT</div>
      <h1 class="aip-about-title">关于 Ai Power</h1>
      <p class="aip-about-sub">功率器件研发部门的一站式工具与助手平台</p>
    </section>

    <!-- TABS -->
    <section class="aip-about-tabs">
      <Tabs :tabs="tabs" variant="pill" align="center">
        <template #default="{ active }">
          <Transition name="tp" mode="out-in">
            <div :key="active" class="aip-tab-panel">

              <!-- WHAT -->
              <template v-if="active === 'what'">
                <div class="aip-tab-lede">
                  <h2>一个面向功率器件工程师的内部平台</h2>
                  <p>Ai Power 把部门所有工具 数据 AI 助手与文档集中到一个入口 —— 公开页告诉你我们能做什么 工具台让你立刻上手</p>
                </div>
                <div class="aip-tab-grid aip-tab-grid--2">
                  <div class="aip-tab-card">
                    <span class="aip-tab-tag">公开页</span>
                    <p>面向全部同事 大家看到部门能做什么</p>
                  </div>
                  <div class="aip-tab-card">
                    <span class="aip-tab-tag">工具台</span>
                    <p>面向部门 集成工具 数据 AI 助手与文档</p>
                  </div>
                </div>
              </template>

              <!-- WHY -->
              <template v-else-if="active === 'why'">
                <div class="aip-tab-lede">
                  <h2>把所有计算与决策 集中到一个可追溯的平台上</h2>
                  <p>功率器件设计是一个多工序 多角色 多工具的过程 把所有组件集中到一个平台 是提升部门效能的最快途径</p>
                </div>
                <div class="aip-tab-grid aip-tab-grid--3">
                  <div class="aip-tab-card">
                    <span class="aip-tab-num">01</span>
                    <h3>可复现</h3>
                    <p>每次计算都有脚本 决策可回看 可复核</p>
                  </div>
                  <div class="aip-tab-card">
                    <span class="aip-tab-num">02</span>
                    <h3>可协作</h3>
                    <p>工具 + 数据 + 文档同源 减少跨人沟通成本</p>
                  </div>
                  <div class="aip-tab-card">
                    <span class="aip-tab-num">03</span>
                    <h3>可积累</h3>
                    <p>工程师的工作成果沉淀到平台 越用越好用</p>
                  </div>
                </div>
              </template>

              <!-- STACK -->
              <template v-else-if="active === 'stack'">
                <div class="aip-tab-lede">
                  <h2>前后端都用最简单的栈</h2>
                  <p>能跑得稳 能改得动 能被同事接手 是选择技术栈的三个标准</p>
                </div>
                <div class="aip-tab-grid aip-tab-grid--stack">
                  <div v-for="s in stack" :key="s.n" class="aip-tab-card aip-tab-card--stack">
                    <div class="aip-tab-stack-row">
                      <span class="aip-tab-stack-name">{{ s.n }}</span>
                      <span class="aip-tab-stack-ver">{{ s.v }}</span>
                    </div>
                    <p>{{ s.k }}</p>
                  </div>
                </div>
              </template>

              <!-- TIMELINE -->
              <template v-else-if="active === 'time'">
                <div class="aip-tab-lede">
                  <h2>部门里程碑</h2>
                  <p>从第一个脚本到 12+ 工具接入 我们用了两年半</p>
                </div>
                <div class="aip-timeline">
                  <div v-for="t in timeline" :key="t.yr" class="aip-timeline-item">
                    <div class="yr">{{ t.yr }}</div>
                    <div class="tt">{{ t.tt }}</div>
                    <div class="dc">{{ t.dc }}</div>
                  </div>
                </div>
              </template>

              <!-- NEXT -->
              <template v-else-if="active === 'next'">
                <div class="aip-tab-lede">
                  <h2>开始使用</h2>
                  <p>先看能力清单 再登录工具台开始使用</p>
                </div>
                <div class="aip-cta-actions">
                  <a class="hp-btn primary" href="/capabilities">查看能力</a>
                  <a class="hp-btn ghost" href="/login">登录工具台</a>
                </div>
                <div class="aip-tab-contact">
                  <span class="aip-tab-tag">CONTACT</span>
                  <p>反馈与贡献 <a href="mailto:aipower@company.local">aipower@company.local</a></p>
                </div>
              </template>

            </div>
          </Transition>
        </template>
      </Tabs>
    </section>
  </div>
</template>

<style scoped>
:deep(.VPDoc) { padding: 0 !important; max-width: none !important; }
:deep(.vp-doc) { padding: 0 !important; }
:deep(.vp-doc h1) { display: none; }

.aip-about-hero {
  text-align: center;
  padding: var(--aip-s-13) var(--aip-s-5) var(--aip-s-9);
  max-width: 960px;
  margin: 0 auto;
}
.aip-eyebrow {
  font-family: var(--aip-font-mono);
  font-size: var(--aip-fs-sm);
  letter-spacing: 0.20em;
  text-transform: uppercase;
  color: var(--aip-text-secondary);
  margin-bottom: var(--aip-s-4);
}
.aip-about-title {
  font-size: var(--aip-fs-display);
  font-weight: 600;
  letter-spacing: -0.035em;
  margin: 0 0 var(--aip-s-5);
  color: var(--aip-text-primary);
  line-height: 1.02;
}
.aip-about-sub {
  font-size: var(--aip-fs-md);
  color: var(--aip-text-secondary);
  line-height: 1.55;
  max-width: 640px;
  margin: 0 auto;
}

.aip-about-tabs {
  padding: 0 var(--aip-s-5) var(--aip-section-y);
  background: var(--aip-bg-base);
}

.aip-tab-panel {
  max-width: 1080px;
  margin: 0 auto;
  min-height: 480px;       /* prevent height jump on tab switch */
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 48px;
}

/* Smooth fade + lift when switching tabs */
.tp-enter-active, .tp-leave-active {
  transition: opacity 280ms var(--aip-ease-out),
              transform 280ms var(--aip-ease-out);
}
.tp-enter-from { opacity: 0; transform: translateY(12px); }
.tp-leave-to   { opacity: 0; transform: translateY(-12px); }

.aip-tab-lede {
  text-align: center;
  max-width: 720px;
  margin: 0 auto;
}
.aip-tab-lede h2 {
  font-size: var(--aip-fs-3xl);
  font-weight: 600;
  letter-spacing: -0.025em;
  line-height: 1.15;
  color: var(--aip-text-primary);
  margin: 0 0 16px;
}
.aip-tab-lede p {
  font-size: var(--aip-fs-md);
  color: var(--aip-text-secondary);
  line-height: 1.6;
  margin: 0;
}

.aip-tab-grid { display: grid; gap: var(--aip-s-4); }
.aip-tab-grid--2 { grid-template-columns: repeat(2, 1fr); }
.aip-tab-grid--3 { grid-template-columns: repeat(3, 1fr); }
.aip-tab-grid--stack { grid-template-columns: repeat(4, 1fr); }

.aip-tab-card {
  background: var(--aip-bg-elevated);
  border: 1px solid var(--aip-border-subtle);
  border-radius: var(--aip-radius-lg);
  padding: var(--aip-s-6);
  display: flex;
  flex-direction: column;
  gap: var(--aip-s-3);
  transition: border-color var(--aip-dur-base) var(--aip-ease-out);
}
.aip-tab-card:hover { border-color: var(--aip-text-primary); }
.aip-tab-card h3 {
  font-size: var(--aip-fs-lg);
  font-weight: 600;
  letter-spacing: -0.015em;
  margin: 0;
}
.aip-tab-card p {
  font-size: var(--aip-fs-sm);
  color: var(--aip-text-secondary);
  line-height: 1.6;
  margin: 0;
}
.aip-tab-tag {
  align-self: flex-start;
  display: inline-block;
  font-family: var(--aip-font-mono);
  font-size: var(--aip-fs-xs);
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: var(--aip-text-secondary);
  padding: 4px 10px;
  border: 1px solid var(--aip-border-subtle);
  border-radius: var(--aip-radius-pill);
}
.aip-tab-num {
  font-family: var(--aip-font-mono);
  font-size: var(--aip-fs-2xl);
  color: var(--aip-text-primary);
  font-weight: 500;
  letter-spacing: -0.02em;
}

.aip-tab-card--stack .aip-tab-stack-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  border-bottom: 1px solid var(--aip-border-subtle);
  padding-bottom: var(--aip-s-2);
}
.aip-tab-stack-name {
  font-family: var(--aip-font-mono);
  font-size: var(--aip-fs-base);
  font-weight: 500;
  color: var(--aip-text-primary);
}
.aip-tab-stack-ver {
  font-family: var(--aip-font-mono);
  font-size: var(--aip-fs-xs);
  color: var(--aip-text-tertiary);
  letter-spacing: 0.04em;
}

.aip-timeline {
  display: flex;
  flex-direction: column;
  gap: var(--aip-s-5);
  max-width: 720px;
  margin: 0 auto;
  position: relative;
  padding-left: var(--aip-s-7);
}
.aip-timeline::before {
  content: '';
  position: absolute;
  left: 12px;
  top: 12px; bottom: 12px;
  width: 1px;
  background: var(--aip-border-subtle);
}
.aip-timeline-item {
  position: relative;
  padding-bottom: var(--aip-s-3);
}
.aip-timeline-item::before {
  content: '';
  position: absolute;
  left: calc(-1 * var(--aip-s-7) + 7px);
  top: 8px;
  width: 11px; height: 11px;
  border-radius: 50%;
  background: var(--aip-bg-base);
  border: 2px solid var(--aip-text-primary);
}
.aip-timeline-item .yr {
  font-family: var(--aip-font-mono);
  font-size: var(--aip-fs-xs);
  letter-spacing: 0.10em;
  color: var(--aip-text-tertiary);
  text-transform: uppercase;
  margin-bottom: var(--aip-s-1);
}
.aip-timeline-item .tt {
  font-size: var(--aip-fs-lg);
  font-weight: 600;
  letter-spacing: -0.015em;
  color: var(--aip-text-primary);
  margin-bottom: var(--aip-s-1);
}
.aip-timeline-item .dc {
  font-size: var(--aip-fs-sm);
  color: var(--aip-text-secondary);
  line-height: 1.6;
}

.aip-cta-actions {
  display: flex;
  justify-content: center;
  gap: var(--aip-s-3);
  margin-bottom: var(--aip-s-7);
}
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
.hp-btn.primary:hover { background: #000000; }
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

.aip-tab-contact {
  text-align: center;
  padding-top: var(--aip-s-7);
  border-top: 1px solid var(--aip-border-subtle);
}
.aip-tab-contact .aip-tab-tag { margin-bottom: var(--aip-s-2); }
.aip-tab-contact p { font-size: var(--aip-fs-sm); color: var(--aip-text-secondary); }
.aip-tab-contact a { color: var(--aip-text-link); text-decoration: none; }
.aip-tab-contact a:hover { text-decoration: underline; }

@media (max-width: 1024px) {
  .aip-tab-grid--2, .aip-tab-grid--3, .aip-tab-grid--stack { grid-template-columns: repeat(2, 1fr); }
  .aip-about-title { font-size: var(--aip-fs-4xl); }
  .aip-tab-lede h2 { font-size: var(--aip-fs-2xl); }
}
@media (max-width: 640px) {
  .aip-tab-grid--2, .aip-tab-grid--3, .aip-tab-grid--stack { grid-template-columns: 1fr; }
  .aip-about-title { font-size: var(--aip-fs-3xl); }
  .aip-tab-lede h2 { font-size: var(--aip-fs-xl); }
  .aip-about-tabs { padding: 0 var(--aip-s-4) var(--aip-section-y-md); }
}
</style>