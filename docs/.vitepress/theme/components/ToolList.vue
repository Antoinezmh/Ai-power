<script setup lang="ts">
interface Tool {
  title: string; slug: string; description: string;
  version: string; status: 'stable'|'beta'|'deprecated';
  kind: 'web'|'gui'|'cli'|'notebook'|'sop';
  owner: string; group: string;
  updated: string; updatedLabel: string;
  tags?: string[]; entry?: string; repo?: string; docs?: string;
}
const props = defineProps<{ tools: Tool[]; emptyText?: string }>()
</script>

<template>
  <div class="aip-tool-grid">
    <template v-if="tools.length">
      <ToolCard v-for="t in tools" :key="t.slug" :tool="t" />
    </template>
    <div v-else class="aip-empty">
      {{ emptyText || '暂无匹配的工具' }}
    </div>
  </div>
</template>

<style scoped>
.aip-tool-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}
.aip-empty {
  grid-column: 1 / -1;
  padding: 48px;
  text-align: center;
  color: var(--aip-text-secondary);
  background: var(--aip-bg-surface);
  border: 1px dashed var(--aip-border);
  border-radius: var(--aip-radius-md);
  font-family: var(--aip-font-mono);
  font-size: 13px;
}
</style>
