<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'

export interface Tab {
  key: string
  label: string
  icon?: string
}

const props = withDefaults(defineProps<{
  tabs: Tab[]
  modelValue?: string
  variant?: 'pill' | 'underline'
  hash?: boolean
  align?: 'left' | 'center'
}>(), {
  variant: 'pill',
  hash: true,
  align: 'center',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const active = ref<string>(props.modelValue || props.tabs[0]?.key || '')

const readHash = () => {
  if (!props.hash || typeof window === 'undefined') return
  const h = location.hash.replace(/^#/, '')
  if (h && props.tabs.some(t => t.key === h)) active.value = h
}

onMounted(() => {
  readHash()
  if (!active.value && props.tabs.length) active.value = props.tabs[0].key
})

watch(() => props.modelValue, (v) => { if (v && v !== active.value) active.value = v })

watch(active, (v) => {
  emit('update:modelValue', v)
  if (props.hash && typeof window !== 'undefined') {
    history.replaceState(null, '', '#' + v)
  }
})

const onKey = (e: KeyboardEvent) => {
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
  e.preventDefault()
  const i = props.tabs.findIndex(t => t.key === active.value)
  if (i < 0) return
  let next = e.key === 'ArrowRight' ? i + 1 : i - 1
  next = (next + props.tabs.length) % props.tabs.length
  active.value = props.tabs[next].key
}
</script>

<template>
  <div class="aip-tabs" :class="[`is-${variant}`, `align-${align}`]">
    <div
      class="aip-tabs-bar"
      role="tablist"
      tabindex="0"
      @keydown="onKey"
    >
      <button
        v-for="t in tabs"
        :key="t.key"
        role="tab"
        type="button"
        :aria-selected="active === t.key"
        :tabindex="active === t.key ? 0 : -1"
        :class="['aip-tab', { active: active === t.key }]"
        @click="active = t.key"
      >
        <span v-if="t.icon" class="tab-icon">{{ t.icon }}</span>
        <span>{{ t.label }}</span>
      </button>
    </div>
    <div class="aip-tabs-panels">
      <slot :active="active" />
    </div>
  </div>
</template>

<style scoped>
.aip-tabs.align-center .aip-tabs-bar { justify-content: center; }
.aip-tabs.align-left   .aip-tabs-bar { justify-content: flex-start; }
</style>