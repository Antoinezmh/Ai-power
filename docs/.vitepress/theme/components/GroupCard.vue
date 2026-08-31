<script setup lang="ts">
defineProps<{
  name: string
  count: number
  href: string
  icon?: string
  desc?: string
}>()
const defaultIcon = '⏚'
</script>

<template>
  <a class="aip-group-card" :href="href">
    <div class="aip-group-icon">{{ icon || defaultIcon }}</div>
    <div class="aip-group-name">{{ name }}</div>
    <div v-if="desc" class="aip-group-desc">{{ desc }}</div>
    <div class="aip-group-count">
      <span class="num">{{ count }}</span>
      <span class="unit">个工具</span>
      <span class="arrow">→</span>
    </div>
  </a>
</template>

<style scoped>
.aip-group-card {
  display: block;
  padding: 20px;
  background: var(--aip-bg-surface);
  border: 1px solid var(--aip-border);
  border-radius: var(--aip-radius-md);
  text-decoration: none;
  color: inherit;
  transition: all 150ms ease-out;
  position: relative;
}
.aip-group-card:hover {
  border-color: var(--aip-brand);
  background: var(--aip-bg-elevated);
}
.aip-group-icon {
  font-family: var(--aip-font-mono);
  font-size: 22px;
  color: var(--aip-brand);
  margin-bottom: 12px;
}
.aip-group-name {
  font-size: 16px;
  font-weight: 500;
  color: var(--aip-text-primary);
  margin-bottom: 6px;
}
.aip-group-desc {
  font-size: 12px;
  color: var(--aip-text-secondary);
  line-height: 1.5;
  min-height: 36px;
}
.aip-group-count {
  font-family: var(--aip-font-mono);
  font-size: 12px;
  color: var(--aip-text-secondary);
  display: flex; align-items: center; gap: 6px;
  padding-top: 12px;
  border-top: 1px dashed var(--aip-border);
  margin-top: 12px;
}
.aip-group-count .num { color: var(--aip-accent); font-size: 16px; font-weight: 500; }
.aip-group-count .unit { letter-spacing: 0.04em; }
.aip-group-count .arrow { margin-left: auto; color: var(--aip-brand); }
.aip-group-card:hover .aip-group-count .arrow { transform: translateX(3px); transition: transform 150ms ease-out; }
</style>
