<script setup lang="ts">
const props = withDefaults(defineProps<{ tag: string; active?: boolean }>(), { active: false })
</script>

<template>
  <span class="aip-tag" :class="{ active: props.active }">{{ props.tag }}</span>
</template>

<style scoped>
.aip-tag {
  display: inline-block;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--aip-bg-elevated);
  border: 1px solid var(--aip-border);
  color: var(--aip-text-secondary);
  line-height: 1.4;
  font-family: var(--aip-font-ui);
}
.aip-tag.active {
  border-color: var(--aip-brand);
  color: var(--aip-brand);
  background: rgba(77, 163, 255, 0.10);
}
</style>
