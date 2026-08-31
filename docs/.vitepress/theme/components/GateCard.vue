<script setup lang="ts">
interface Props {
  id: string
  title: string
  desc?: string
  toolCount?: number
  status?: 'pending'|'running'|'passed'
}
withDefaults(defineProps<Props>(), {
  status: 'pending',
  toolCount: 0,
  desc: '',
})
</script>

<template>
  <div class="aip-gate" :class="['s-' + status]">
    <div class="gate-id">{{ id }}</div>
    <div class="gate-body">
      <div class="gate-title">{{ title }}</div>
      <div class="gate-desc">{{ desc }}</div>
    </div>
    <div class="gate-tools">{{ toolCount }} 个工具</div>
    <div class="gate-dot" />
  </div>
</template>

<style scoped>
.aip-gate {
  display: grid;
  grid-template-columns: 56px 1fr auto 14px;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  background: var(--aip-bg-surface);
  border: 1px solid var(--aip-border);
  border-radius: var(--aip-radius-md);
  transition: all 150ms ease-out;
  cursor: pointer;
}
.aip-gate:hover { border-color: var(--aip-brand); }
.gate-id {
  font-family: var(--aip-font-mono);
  font-size: 14px;
  font-weight: 500;
  color: var(--aip-brand);
  background: rgba(77,163,255,0.10);
  border-radius: var(--aip-radius-sm);
  padding: 6px 0;
  text-align: center;
}
.gate-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--aip-text-primary);
  margin-bottom: 2px;
}
.gate-desc {
  font-size: 12px;
  color: var(--aip-text-secondary);
}
.gate-tools {
  font-family: var(--aip-font-mono);
  font-size: 11px;
  color: var(--aip-text-mono);
  letter-spacing: 0.04em;
  white-space: nowrap;
}
.gate-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: var(--aip-warn);
  box-shadow: 0 0 8px currentColor;
}
.s-passed .gate-dot { background: var(--aip-ok); }
.s-running .gate-dot { background: var(--aip-brand); animation: pulse 1.5s infinite; }
.s-pending .gate-dot { background: var(--aip-text-secondary); }

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
</style>
