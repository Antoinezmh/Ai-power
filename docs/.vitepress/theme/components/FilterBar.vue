<script setup lang="ts">
const props = defineProps<{
  filters: { label: string; key: string; options: { label: string; value: string }[] }[]
  values: Record<string, string>
}>()
const emit = defineEmits<{ 'update:values': [Record<string, string>] }>()
const set = (key: string, value: string) => {
  emit('update:values', { ...props.values, [key]: value })
}
</script>

<template>
  <div class="aip-filterbar">
    <div class="filters">
      <label v-for="f in filters" :key="f.key" class="filter">
        <span class="lbl">{{ f.label }}</span>
        <select :value="values[f.key] || ''" @change="set(f.key, ($event.target as HTMLSelectElement).value)">
          <option value="">全部</option>
          <option v-for="o in f.options" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
      </label>
    </div>
  </div>
</template>

<style scoped>
.aip-filterbar {
  display: flex; gap: 12px;
  padding: 12px 16px;
  background: var(--aip-bg-surface);
  border: 1px solid var(--aip-border);
  border-radius: var(--aip-radius-md);
}
.filters { display: flex; gap: 16px; flex-wrap: wrap; }
.filter {
  display: inline-flex; align-items: center; gap: 8px;
  font-family: var(--aip-font-mono);
  font-size: 12px;
  color: var(--aip-text-secondary);
}
.filter .lbl { letter-spacing: 0.04em; }
.filter select {
  background: var(--aip-bg-elevated);
  border: 1px solid var(--aip-border);
  border-radius: var(--aip-radius-sm);
  color: var(--aip-text-primary);
  padding: 5px 10px;
  font-family: var(--aip-font-mono);
  font-size: 12px;
  outline: none;
  cursor: pointer;
  transition: border-color 150ms ease-out;
}
.filter select:hover, .filter select:focus { border-color: var(--aip-brand); }
</style>
