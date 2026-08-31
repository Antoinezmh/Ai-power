<script setup lang="ts">
const timeline = [
  { yr: '2024 · Q1', tt: '规格工具雏形', dc: '第一个 MOSFET FoM 计算脚本上线。' },
  { yr: '2024 · Q3', tt: '工具聚合', dc: 'FoM / SOA / TCAD 校准 三个工具集成到统一 CLI。' },
  { yr: '2025 · Q2', tt: '内部平台上线', dc: '工具台 + AI 助手 v0.1 对内开放。' },
  { yr: '2026 · Q3', tt: 'v1.0', dc: '12+ 工具接入，4 大模块覆盖规格 → 量产。' },
]
</script>

<template>
  <div class="aip-about">
    <section class="aip-about-hero">
      <div class="aip-eyebrow">ABOUT</div>
      <h1 class="aip-about-title">关于 Ai Power</h1>
      <p class="aip-about-sub">功率器件研发部门的一站式工具与助手平台。</p>
    </section>

    <section class="aip-about-body" data-aip-stagger>
      <div class="aip-about-card" data-aip-item>
        <div class="aip-about-card-head">
          <span class="aip-about-tag">WHAT</span>
          <h2>是什么</h2>
        </div>
        <p>Ai Power 是本部门面向内部同事的工具与 AI 助手集成平台。以公开页 + 登录后工具台的双层架构提供：</p>
        <ul>
          <li>公开页面向全部，告诉大家我们能做什么。</li>
          <li>工具台面向部门，将工具、数据、AI 助手、部门文档集中到一个入口。</li>
        </ul>
      </div>

      <div class="aip-about-card" data-aip-item>
        <div class="aip-about-card-head">
          <span class="aip-about-tag">WHY</span>
          <h2>为什么需要</h2>
        </div>
        <p>功率器件设计是一个多工序、多角色、多工具的过程。将所有组件集中到一个可追溯、可复现的平台上，是提升部门效能的最快途径。</p>
      </div>

      <div class="aip-about-card" data-aip-item>
        <div class="aip-about-card-head">
          <span class="aip-about-tag">STACK</span>
          <h2>技术栈</h2>
        </div>
        <p>前端 VitePress + Vue 3，后端 FastAPI，部署于内网容器。</p>
        <div class="aip-stack">
          <span class="aip-stack-chip">VitePress 1.6</span>
          <span class="aip-stack-chip">Vue 3</span>
          <span class="aip-stack-chip">FastAPI</span>
          <span class="aip-stack-chip">Docker</span>
          <span class="aip-stack-chip">Nginx</span>
          <span class="aip-stack-chip">Python 3.11</span>
          <span class="aip-stack-chip">OpenAI API</span>
        </div>
      </div>

      <div class="aip-about-card" data-aip-item>
        <div class="aip-about-card-head">
          <span class="aip-about-tag">TIMELINE</span>
          <h2>部门里程碑</h2>
        </div>
        <div class="aip-timeline">
          <div v-for="t in timeline" :key="t.yr" class="aip-timeline-item">
            <div class="yr">{{ t.yr }}</div>
            <div class="tt">{{ t.tt }}</div>
            <div class="dc">{{ t.dc }}</div>
          </div>
        </div>
      </div>

      <div class="aip-about-card aip-about-card--cta" data-aip-item>
        <div class="aip-about-card-head">
          <span class="aip-about-tag">NEXT</span>
          <h2>开始使用</h2>
        </div>
        <p>先看能力清单，再登录工具台开始使用。</p>
        <div class="aip-about-actions">
          <a class="aip-btn-primary" href="/capabilities">查看能力 →</a>
          <a class="aip-btn-ghost" href="/login">登录工具台</a>
        </div>
      </div>

      <div class="aip-about-contact" data-aip-item>
        <span class="aip-about-tag">CONTACT</span>
        <p>反馈与贡献：<a href="mailto:aipower@company.local">aipower@company.local</a></p>
      </div>
    </section>
  </div>
</template>

<style scoped>
:deep(.VPDoc) { padding: 0 !important; max-width: none !important; }
:deep(.vp-doc) { padding: 0 !important; }
:deep(.vp-doc h1) { display: none; }
</style>