<script setup lang="ts">
interface Props {
  title?: string
  subtitle?: string
  stats?: { label: string; value: string | number }[]
  primaryHref?: string
  primaryText?: string
  secondaryHref?: string
  secondaryText?: string
}
withDefaults(defineProps<Props>(), {
  title: 'Ai Power',
  subtitle: 'Power Device Engineering, Engineered.',
  stats: () => [
    { label: '工具', value: 28 },
    { label: '分组', value: 8 },
    { label: '最后更新', value: '2 天前' },
  ],
  primaryHref: '/tools/',
  primaryText: '进入工具目录 →',
  secondaryHref: '/pipeline',
  secondaryText: '研发流程图 →',
})
</script>

<template>
  <section class="aip-hero">
    <div class="aip-hero-bg" aria-hidden="true">
      <svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 1200 400">
        <defs>
          <pattern id="aip-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(77,163,255,0.07)" stroke-width="1"/>
          </pattern>
          <radialGradient id="aip-glow" cx="50%" cy="0%" r="60%">
            <stop offset="0%" stop-color="rgba(77,163,255,0.25)"/>
            <stop offset="60%" stop-color="rgba(77,163,255,0.05)"/>
            <stop offset="100%" stop-color="rgba(0,0,0,0)"/>
          </radialGradient>
        </defs>
        <rect width="1200" height="400" fill="url(#aip-glow)"/>
        <rect width="1200" height="400" fill="url(#aip-grid)"/>
      </svg>
    </div>

    <div class="aip-hero-inner">
      <div class="aip-hero-mark">⏚</div>
      <h1 class="aip-hero-title">{{ title }}</h1>
      <p class="aip-hero-sub">{{ subtitle }}</p>
      <div class="aip-hero-stats">
        <div v-for="s in stats" :key="s.label" class="stat">
          <div class="value">{{ s.value }}</div>
          <div class="label">{{ s.label }}</div>
        </div>
      </div>
      <div class="aip-hero-actions">
        <a class="aip-btn primary" :href="primaryHref">{{ primaryText }}</a>
        <a class="aip-btn ghost" :href="secondaryHref">{{ secondaryText }}</a>
      </div>
    </div>
  </section>
</template>

<style scoped>
.aip-hero {
  position: relative;
  padding: 96px 0 80px;
  overflow: hidden;
  border-bottom: 1px solid var(--aip-border);
}
.aip-hero-bg { position: absolute; inset: 0; z-index: 0; }
.aip-hero-inner { position: relative; z-index: 1; max-width: 1120px; margin: 0 auto; padding: 0 32px; }
.aip-hero-mark {
  font-family: var(--aip-font-mono);
  font-size: 64px;
  color: var(--aip-brand);
  margin-bottom: 16px;
}
.aip-hero-title {
  font-size: 56px;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 0 0 12px;
  color: var(--aip-text-primary);
}
.aip-hero-sub {
  font-family: var(--aip-font-mono);
  font-size: 16px;
  color: var(--aip-text-secondary);
  margin: 0 0 36px;
  letter-spacing: 0.04em;
}
.aip-hero-stats {
  display: flex; gap: 48px; margin-bottom: 36px;
  padding: 16px 0;
  border-top: 1px solid var(--aip-border);
  border-bottom: 1px solid var(--aip-border);
}
.stat .value {
  font-family: var(--aip-font-mono);
  font-size: 24px; font-weight: 500;
  color: var(--aip-text-primary);
}
.stat .label {
  font-size: 12px;
  color: var(--aip-text-secondary);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-top: 2px;
}
.aip-hero-actions { display: flex; gap: 12px; }
.aip-btn {
  font-family: var(--aip-font-mono);
  font-size: 13px;
  padding: 10px 18px;
  border-radius: var(--aip-radius-sm);
  text-decoration: none;
  transition: all 150ms ease-out;
  border: 1px solid var(--aip-border);
  letter-spacing: 0.04em;
}
.aip-btn.primary {
  background: var(--aip-brand);
  color: #FFFFFF;
  border-color: var(--aip-brand);
}
.aip-btn.primary:hover { background: #4F5FE5; border-color: #4F5FE5; }
.aip-btn.ghost {
  background: transparent;
  color: var(--aip-text-primary);
}
.aip-btn.ghost:hover { border-color: var(--aip-brand); color: var(--aip-brand); }

@media (max-width: 640px) {
  .aip-hero-title { font-size: 40px; }
  .aip-hero-stats { gap: 24px; }
}
</style>
