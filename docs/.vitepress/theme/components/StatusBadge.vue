<script setup lang="ts">
const props = defineProps<{ status: 'stable' | 'beta' | 'deprecated' }>()
const labels = { stable: '稳定', beta: '内测', deprecated: '弃用' } as const
const cls = { stable: 'ok', beta: 'warn', deprecated: 'danger' } as const
</script>

<template>
  <span class="aip-status" :class="cls[props.status]">
    <span class="dot" />
    {{ labels[props.status] }}
  </span>
</template>

<style scoped>
.aip-status {
  display: inline-flex; align-items: center; gap: 5px;
  font-family: var(--aip-font-mono);
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid currentColor;
  line-height: 1;
  letter-spacing: 0.04em;
}
.dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 6px currentColor;
}
.aip-status.ok { color: var(--aip-ok); background: rgba(34, 197, 94, 0.08); }
.aip-status.warn { color: var(--aip-warn); background: rgba(245, 158, 11, 0.08); }
.aip-status.danger { color: var(--aip-danger); background: rgba(239, 68, 68, 0.08); }
</style>
