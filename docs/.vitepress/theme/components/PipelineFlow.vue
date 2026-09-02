<script setup lang="ts">
interface Gate {
  id: string
  title: string
  desc: string
  toolCount: number
  status?: 'pending' | 'running' | 'passed'
}
const props = defineProps<{ gates?: Gate[] }>()

const defaultGates: Gate[] = [
  { id: 'G0', title: '规格', desc: '器件参数与性能指标', toolCount: 3, status: 'passed' },
  { id: 'G1', title: '建模', desc: 'TCAD 与 SPICE 子电路模型', toolCount: 5, status: 'running' },
  { id: 'G2', title: '版图', desc: 'Layout 与 DRC/LVS', toolCount: 4, status: 'pending' },
  { id: 'G3', title: '工艺', desc: 'Mask 与流片参数', toolCount: 2, status: 'pending' },
  { id: 'G4', title: '测试', desc: '静态/动态/热力学', toolCount: 7, status: 'pending' },
  { id: 'G5', title: '可靠性', desc: 'HTOL/HTRB/PC', toolCount: 4, status: 'pending' },
  { id: 'G6', title: '量产', desc: 'Binning 与 SPC', toolCount: 1, status: 'pending' },
]
const gates = props.gates ?? defaultGates
</script>

<template>
  <div class="aip-pipeline">
    <div class="rail" />
    <GateCard
      v-for="g in gates"
      :key="g.id"
      :id="g.id"
      :title="g.title"
      :desc="g.desc"
      :tool-count="g.toolCount"
      :status="g.status"
    />
  </div>
</template>

<style scoped>
.aip-pipeline {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 0;
}
.rail {
  position: absolute;
  left: 39px;
  top: 24px;
  bottom: 24px;
  width: 2px;
  background: var(--aip-border);
  opacity: 0.4;
}
</style>
