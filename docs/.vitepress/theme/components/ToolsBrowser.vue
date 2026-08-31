<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

interface Tool {
  title: string; slug: string; description: string
  version: string; status: 'stable'|'beta'|'deprecated'
  kind: 'web'|'gui'|'cli'|'notebook'|'sop'
  owner: string; group: string
  updated: string; updatedLabel: string
  tags?: string[]
}

const allTools = ref<Tool[]>([])
const group = ref<string>('全部')
const kindFilter = ref<string>('')
const statusFilter = ref<string>('')
const ownerFilter = ref<string>('')
const sort = ref<string>('updated')

onMounted(async () => {
  const res = await fetch(`${import.meta.env.BASE_URL || '/'}tools.json`)
  if (res.ok) allTools.value = await res.json()
})

const groups = ['全部', '规格', '建模', '版图', '工艺', '测试', '可靠性', '失效分析', 'SOP']

const owners = computed(() => Array.from(new Set(allTools.value.map(t => t.owner))).filter(Boolean))
const kinds = [
  { value: '', label: '全部' },
  { value: 'web', label: 'Web' },
  { value: 'gui', label: 'GUI' },
  { value: 'cli', label: 'CLI' },
  { value: 'notebook', label: 'Notebook' },
  { value: 'sop', label: 'SOP' },
]
const statuses = [
  { value: '', label: '全部' },
  { value: 'stable', label: '稳定' },
  { value: 'beta', label: '内测' },
  { value: 'deprecated', label: '弃用' },
]

const filtered = computed(() => {
  let list = allTools.value.slice()
  if (group.value !== '全部') list = list.filter(t => t.group === group.value)
  if (kindFilter.value) list = list.filter(t => t.kind === kindFilter.value)
  if (statusFilter.value) list = list.filter(t => t.status === statusFilter.value)
  if (ownerFilter.value) list = list.filter(t => t.owner === ownerFilter.value)
  if (sort.value === 'updated') {
    list.sort((a, b) => b.updated.localeCompare(a.updated))
  } else if (sort.value === 'name') {
    list.sort((a, b) => a.title.localeCompare(b.title))
  }
  return list
})

const resetFilters = () => {
  kindFilter.value = ''
  statusFilter.value = ''
  ownerFilter.value = ''
}
</script>

<template>
  <div class="aip-tools-browser">
    <div class="browser-head">
      <h1>工具目录</h1>
      <p class="count">{{ allTools.length }} 个工具 · {{ groups.length - 1 }} 个分组</p>
    </div>

    <GroupTabs
      v-model="group"
      :tabs="groups.map(g => ({ label: g, value: g }))"
    />

    <div class="filter-row">
      <FilterBar
        :filters="[
          { label: '类型', key: 'kind', options: kinds.filter(k => k.value).map(k => ({ label: k.label, value: k.value })) },
          { label: '状态', key: 'status', options: statuses.filter(s => s.value).map(s => ({ label: s.label, value: s.value })) },
          { label: '责任人', key: 'owner', options: owners.map(o => ({ label: o, value: o })) },
        ]"
        :values="{ kind: kindFilter, status: statusFilter, owner: ownerFilter }"
        @update:values="(v) => { kindFilter = v.kind || ''; statusFilter = v.status || ''; ownerFilter = v.owner || '' }"
      />
      <div class="sort">
        <label>排序</label>
        <select v-model="sort">
          <option value="updated">最近更新</option>
          <option value="name">名称</option>
        </select>
      </div>
      <button class="reset" @click="resetFilters">重置</button>
    </div>

    <ToolList :tools="filtered" empty-text="该分组下暂无匹配的工具。试试重置筛选器？" />
  </div>
</template>

<style scoped>
.aip-tools-browser { display: flex; flex-direction: column; gap: 20px; }
.browser-head h1 { margin: 0 0 4px; font-size: 32px; font-weight: 700; }
.browser-head .count {
  margin: 0 0 12px; font-family: var(--aip-font-mono);
  font-size: 13px; color: var(--aip-text-secondary);
}
.filter-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.filter-row .sort {
  display: inline-flex; align-items: center; gap: 8px;
  font-family: var(--aip-font-mono); font-size: 12px;
  color: var(--aip-text-secondary);
}
.filter-row .sort select,
.filter-row .reset {
  background: var(--aip-bg-surface);
  border: 1px solid var(--aip-border);
  border-radius: var(--aip-radius-sm);
  color: var(--aip-text-primary);
  padding: 8px 12px;
  font-family: var(--aip-font-mono);
  font-size: 12px;
  cursor: pointer;
  transition: border-color 150ms ease-out;
}
.filter-row .sort select:hover,
.filter-row .reset:hover { border-color: var(--aip-brand); }
.filter-row > :first-child { flex: 1; min-width: 300px; }
</style>
