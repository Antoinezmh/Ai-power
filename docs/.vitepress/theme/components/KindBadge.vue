<script setup lang="ts">
const props = defineProps<{ kind: 'web' | 'gui' | 'cli' | 'notebook' | 'sop' }>()
const labels = { web: 'Web', gui: 'GUI', cli: 'CLI', notebook: 'Notebook', sop: 'SOP' } as const
</script>

<template>
  <span class="aip-kind">{{ labels[props.kind] }}</span>
</template>

<style scoped>
.aip-kind {
  display: inline-block;
  font-family: var(--aip-font-mono);
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.06em;
  padding: 2px 7px;
  border-radius: var(--aip-radius-sm);
  background: rgba(77, 163, 255, 0.10);
  color: var(--aip-brand);
  border: 1px solid rgba(77, 163, 255, 0.30);
  line-height: 1;
  text-transform: uppercase;
}
</style>
