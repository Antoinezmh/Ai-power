<script setup lang="ts">
import { computed } from 'vue'

interface Tool {
  title: string
  slug: string
  description: string
  version: string
  status: 'stable' | 'beta' | 'deprecated'
  kind: 'web' | 'gui' | 'cli' | 'notebook' | 'sop'
  owner: string
  group: string
  updated: string
  updatedLabel: string
  tags?: string[]
  entry?: string
  repo?: string
  docs?: string
}

const props = defineProps<{ tool: Tool }>()

const icon = computed(() => {
  const map: Record<string, string> = {
    web: '⌬', gui: '▣', cli: '▶', notebook: '⊞', sop: '☰',
  }
  return map[props.tool.kind] ?? '⏚'
})

const link = computed(() => `/tools/${props.tool.slug}`)
</script>

<template>
  <a class="aip-tool-card" :href="link">
    <div class="aip-tool-head">
      <div class="aip-tool-icon">{{ icon }}</div>
      <div class="aip-tool-title">
        <div class="name">{{ tool.title }}</div>
        <KindBadge :kind="tool.kind" />
      </div>
      <StatusBadge :status="tool.status" />
    </div>

    <div class="aip-tool-desc">{{ tool.description }}</div>

    <div class="aip-tool-meta">
      <span class="ver">#{{ tool.version }}</span>
      <span class="sep">·</span>
      <span class="owner">{{ tool.owner }}</span>
      <span class="sep">·</span>
      <span class="time">{{ tool.updatedLabel }}</span>
    </div>

    <div v-if="tool.tags?.length" class="aip-tool-tags">
      <TagPill v-for="t in tool.tags.slice(0, 3)" :key="t" :tag="t" />
    </div>

    <div class="aip-tool-actions">
      <span class="action">打开 →</span>
      <span v-if="tool.repo" class="action">源码</span>
      <span v-if="tool.docs" class="action">文档</span>
    </div>
  </a>
</template>

<style scoped>
.aip-tool-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 18px;
  background: var(--aip-bg-surface);
  border: 1px solid var(--aip-border);
  border-radius: var(--aip-radius-md);
  text-decoration: none;
  color: inherit;
  transition: all 150ms ease-out;
  position: relative;
}
.aip-tool-card:hover {
  border-color: var(--aip-brand);
  background: var(--aip-bg-elevated);
  transform: translateY(-1px);
}
.aip-tool-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0;
  width: 3px; height: 100%;
  background: transparent;
  border-radius: 3px 0 0 3px;
  transition: background 150ms ease-out;
}
.aip-tool-card:hover::before { background: var(--aip-brand); }

.aip-tool-head { display: flex; align-items: center; gap: 10px; }
.aip-tool-icon {
  font-family: var(--aip-font-mono);
  font-size: 18px;
  color: var(--aip-brand);
  width: 32px; height: 32px;
  display: inline-flex; align-items: center; justify-content: center;
  background: rgba(77, 163, 255, 0.10);
  border-radius: var(--aip-radius-sm);
}
.aip-tool-title { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; }
.aip-tool-title .name {
  font-family: var(--aip-font-mono);
  font-weight: 500;
  font-size: 14px;
  color: var(--aip-text-primary);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.aip-tool-desc {
  font-size: 13px; color: var(--aip-text-secondary); line-height: 1.55;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.aip-tool-meta {
  font-family: var(--aip-font-mono); font-size: 11px; color: var(--aip-text-mono);
  display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
}
.aip-tool-meta .sep { color: var(--aip-border); }
.aip-tool-meta .ver { color: var(--aip-accent); }
.aip-tool-meta .time { color: var(--aip-text-secondary); }
.aip-tool-tags { display: flex; flex-wrap: wrap; gap: 4px; }
.aip-tool-actions {
  display: flex; gap: 14px; padding-top: 8px;
  border-top: 1px dashed var(--aip-border); margin-top: auto;
}
.action {
  font-family: var(--aip-font-mono); font-size: 11px;
  color: var(--aip-text-secondary); letter-spacing: 0.04em;
  transition: color 150ms ease-out;
}
.aip-tool-card:hover .action { color: var(--aip-brand); }
</style>
