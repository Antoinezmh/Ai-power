<script setup lang="ts">
const props = defineProps<{
  tabs: { label: string; value: string }[]
  modelValue: string
}>()
const emit = defineEmits<{ 'update:modelValue': [string] }>()
const pick = (v: string) => emit('update:modelValue', v)
</script>

<template>
  <div class="aip-tabs" role="tablist">
    <button
      v-for="t in tabs"
      :key="t.value"
      role="tab"
      :aria-selected="t.value === modelValue"
      :class="['tab', { active: t.value === modelValue }]"
      @click="pick(t.value)"
    >
      {{ t.label }}
    </button>
  </div>
</template>

<style scoped>
.aip-tabs {
  display: flex; gap: 4px;
  padding: 4px;
  background: var(--aip-bg-surface);
  border: 1px solid var(--aip-border);
  border-radius: var(--aip-radius-md);
  overflow-x: auto;
  scrollbar-width: thin;
}
.tab {
  font-family: var(--aip-font-mono);
  font-size: 13px;
  padding: 8px 14px;
  background: transparent;
  border: none;
  border-radius: var(--aip-radius-sm);
  color: var(--aip-text-secondary);
  cursor: pointer;
  white-space: nowrap;
  transition: all 150ms ease-out;
}
.tab:hover { color: var(--aip-text-primary); }
.tab.active {
  background: var(--aip-brand);
  color: #FFFFFF;
  font-weight: 500;
}
</style>
