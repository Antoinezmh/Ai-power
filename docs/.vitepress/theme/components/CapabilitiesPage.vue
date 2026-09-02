<script setup lang="ts">
const capabilities = [
  {
    size: 'is-1',
    icon: '⏚',
    num: '01',
    name: '规格',
    en: 'SPEC',
    desc: '从客户需求到参数表、从 FoM 到热阻折。把分散在 Excel、PDF、邮件里的规格收敛为单一来源。',
    pts: ['参数拓扑报告自动生成', '多电压档对照表', '热障折与热网络估算', 'FoM 与 Ron,sp 计算', '包装类型匹配', '条件表自动归档'],
  },
  { size: 'is-2', icon: '◬', num: '02', name: '建模', en: 'MODEL',
    desc: 'TCAD 与 SPICE 双轮驱动，从器件物理到电路仿真的全链路。',
    pts: ['TCAD 参数自动校准', 'SPICE subckt 提取', 'Corner 与 Monte Carlo', '寄生 R/C 提取', '工艺变化推演'] },
  { size: 'is-3', icon: '⏱', num: '03', name: '测试', en: 'TEST',
    desc: '动态、静态、热、可靠性 一站式。',
    pts: ['SOA 自动绘制', '双脉冲损耗计算', '瞬态热阻折拟合', 'Binning 与良率分析', '高温反面 IV/CV', 'TLP 数据解析'] },
  { size: 'is-4', icon: '⌛', num: '04', name: '可靠性', en: 'RELIABILITY',
    desc: '从老化试验到寿命预测、从样本到报警。',
    pts: ['HTOL / HTRB / HAST 监测', '功率循环寿命预测', '高温反面变化跟踪', '样本预警', '失效树与回放'] },
  { size: 'is-5', icon: '◔', num: '05', name: 'SOP', en: 'SOP',
    desc: '测试流程模板、签核清单与新人引导。',
    pts: ['测试模板库', '签核清单', '新人 oncall 手册'] },
]
</script>

<template>
  <div class="aip-page">
    <section class="aip-page-hero">
      <div class="aip-eyebrow">CAPABILITIES</div>
      <h1 class="aip-page-title">能力详情</h1>
      <p class="aip-page-sub">四个模块、八项原则、上百个具体能力。</p>

      <div class="aip-proof-strip" style="margin: 32px auto 0; max-width: 720px;">
        <div class="item"><span class="v">12+</span><span class="l">核心工具</span></div>
        <div class="item"><span class="v">28</span><span class="l">细分能力</span></div>
        <div class="item"><span class="v">4</span><span class="l">研发阶段</span></div>
        <div class="item"><span class="v">100%</span><span class="l">可复现脚本</span></div>
      </div>
    </section>

    <section class="aip-page-body">
      <div class="aip-bento" data-aip-stagger>
        <article
          v-for="c in capabilities"
          :key="c.num"
          class="aip-bento-tile"
          :class="c.size"
          data-aip-item
        >
          <div class="head">
            <div class="icon">{{ c.icon }}</div>
            <div class="num">{{ c.num }}</div>
          </div>
          <div class="name">{{ c.name }}</div>
          <div class="en">{{ c.en }}</div>
          <div class="desc">{{ c.desc }}</div>
          <ul v-if="c.pts.length" class="pts">
            <li v-for="p in c.pts" :key="p">{{ p }}</li>
          </ul>
        </article>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* Full-bleed: override .VPDoc container */
:deep(.VPDoc) { padding: 0 !important; max-width: none !important; }
:deep(.vp-doc) { padding: 0 !important; }
:deep(.vp-doc h1) { display: none; }
</style>
