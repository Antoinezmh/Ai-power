<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vitepress'
import { auth } from '../auth'
import AgentDock from './AgentDock.vue'

interface Tool {
  slug: string
  title: string
  kind: 'web' | 'gui' | 'cli' | 'notebook' | 'sop'
  status?: 'stable' | 'beta' | 'deprecated'
  description?: string
  group: string
  icon?: string
  entry?: string
  owner?: string
}

const tools = ref<Tool[]>([])
const loading = ref(true)
const filterKind = ref<string>('')
const search = ref('')
const searchFocused = ref(false)

onMounted(async () => {
  auth.init()
  if (!auth.isAuthenticated.value) {
    const route = useRoute()
    useRouter().go('/login?redirect=' + encodeURIComponent(route.path))
    return
  }
  try {
    const base = import.meta.env.BASE_URL || '/'
    const res = await fetch(`${base}api/tools`, {
      headers: { Authorization: `Bearer ${auth.state.token}` },
    })
    if (res.ok) tools.value = await res.json()
  } finally {
    loading.value = false
  }
})

const groups = ['规格', '建模', '版图', '测试', '可靠性', '失效分析', 'SOP']
const byGroup = computed(() => {
  const filtered = tools.value.filter(t => {
    if (filterKind.value && t.kind !== filterKind.value) return false
    if (search.value && !t.title.toLowerCase().includes(search.value.toLowerCase())) return false
    return true
  })
  return groups.map(g => ({ group: g, items: filtered.filter(t => t.group === g) }))
})

const kindLabel: Record<string, string> = { web: 'Web', gui: 'GUI', cli: 'CLI', notebook: 'Notebook', sop: 'SOP' }
const statusColor: Record<string, string> = { stable: 'var(--aip-ok)', beta: 'var(--aip-warn)', deprecated: 'var(--aip-danger)' }
const kindIcon: Record<string, string> = { web: '⌬', gui: '▣', cli: '▶', notebook: '⊞', sop: '☰' }
const kindAccent: Record<string, string> = {
  web: 'var(--aip-brand)',
  cli: 'var(--aip-accent)',
  gui: 'var(--aip-warn)',
  sop: 'var(--aip-text-secondary)',
  notebook: 'var(--aip-violet)',
}

const openTool = (t: Tool) => {
  if (t.entry) {
    window.open(t.entry, '_blank', 'noopener')
  }
}
</script>

<template>
  <div class="ws">
    <header class="ws-top">
      <a class="ws-brand" href="/">
        <span class="mark">⏚</span>
        <span class="name">Ai Power</span>
        <span class="tag">· 工具台</span>
      </a>
      <div class="ws-search" :class="{ focused: searchFocused }">
        <svg class="search-ic" width="14" height="14" viewBox="0 0 24 24" fill="none">
          <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/>
          <path d="M20 20l-3.5-3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <input
          v-model="search"
          placeholder="搜索工具..."
          @focus="searchFocused = true"
          @blur="searchFocused = false"
        />
      </div>
      <div class="ws-user">
        <span class="dot" />
        {{ auth.state.user?.displayName }}
        <span class="role-pill">{{ auth.state.user?.role || 'engineer' }}</span>
      </div>
    </header>

    <div class="ws-body">
      <aside class="ws-side">
        <div class="side-section">
          <div class="side-title">工具</div>
          <button :class="['side-item', { active: !filterKind }]" @click="filterKind = ''">
            <span class="ic">■</span>全部<span class="count">{{ tools.length }}</span>
          </button>
          <button
            v-for="k in ['web','gui','cli','notebook','sop']"
            :key="k"
            :class="['side-item', { active: filterKind === k }]"
            :style="filterKind === k ? { color: kindAccent[k], borderColor: kindAccent[k] } : {}"
            @click="filterKind = k"
          >
            <span class="ic" :style="{ color: filterKind === k ? kindAccent[k] : 'inherit' }">{{ kindIcon[k] }}</span>
            {{ kindLabel[k] }}
            <span class="count">{{ tools.filter(t => t.kind === k).length }}</span>
          </button>
        </div>
        <div class="side-section">
          <div class="side-title">分组</div>
          <a v-for="g in groups" :key="g" href="#sec" class="side-item-static">{{ g }}</a>
        </div>

        <div class="side-tip">
          <div class="tip-title">快捷入口</div>
          <div class="tip-row"><kbd>⌘</kbd><kbd>K</kbd><span>搜索工具</span></div>
          <div class="tip-row"><kbd>?</kbd><span>查看快捷键</span></div>
        </div>
      </aside>

      <main class="ws-main">
        <div class="hello">
          <h1>欢迎回来，{{ auth.state.user?.displayName.split(' ')[0] || '同事' }}</h1>
          <p>从下面选择一个工具开始。点击可在新页打开。</p>
        </div>

        <section v-for="g in byGroup" :key="g.group" id="sec" class="group">
          <div class="group-head">
            <span class="g-name">{{ g.group }}</span>
            <span class="g-count">{{ g.items.length }} 个工具</span>
          </div>
          <div v-if="g.items.length === 0 && !loading" class="group-empty">暂无工具</div>
          <div class="grid">
            <div v-for="t in g.items" :key="t.slug" class="tcard" @click="openTool(t)">
              <div class="tcard-head">
                <span class="tcard-icon" :style="{ color: kindAccent[t.kind], background: `color-mix(in srgb, ${kindAccent[t.kind]} 12%, transparent)` }">
                  {{ kindIcon[t.kind] }}
                </span>
                <div class="tcard-title">
                  <div class="t">{{ t.title }}</div>
                  <span class="kind">{{ kindLabel[t.kind] }}</span>
                </div>
                <span class="tcard-status" :style="{ background: statusColor[t.status || 'stable'] }" />
              </div>
              <div class="tcard-desc">{{ t.description || '点击打开使用' }}</div>
              <div class="tcard-foot">
                <span v-if="t.owner" class="owner">👤 {{ t.owner }}</span>
                <span class="open">打开 →</span>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>

    <AgentDock />
  </div>
</template>

<style scoped>
.ws {
  position: relative;
  min-height: 100vh;
  background: var(--aip-bg-base);
  color: var(--aip-text-primary);
  font-family: var(--aip-font-ui);
}

/* Top bar — light frosted */
.ws-top {
  position: sticky; top: 0; z-index: 50;
  display: flex; align-items: center; gap: var(--aip-s-6);
  padding: var(--aip-s-3) var(--aip-s-6);
  background: var(--aip-bg-base);
  border-bottom: 1px solid var(--aip-glass-border);
}
.ws-brand {
  display: inline-flex; align-items: center; gap: var(--aip-s-3);
  font-family: var(--aip-font-mono);
  font-size: var(--aip-fs-base);
  font-weight: 600;
  color: var(--aip-text-primary);
  text-decoration: none;
}
.ws-brand .mark {
  display: inline-flex; align-items: center; justify-content: center;
  width: 30px; height: 30px;
  font-size: 16px;
  background: #FFFFFF;
  border: 1px solid var(--aip-glass-border-hi);
  border-radius: var(--aip-radius-sm);
  color: var(--aip-brand);
}
.ws-brand .tag { font-size: var(--aip-fs-xs); color: var(--aip-text-secondary); }

.ws-search { flex: 1; max-width: 480px; position: relative; }
.ws-search .search-ic {
  position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
  color: var(--aip-text-secondary);
  transition: color var(--aip-dur-fast) var(--aip-ease-out);
}
.ws-search input {
  width: 100%;
  background: var(--aip-bg-base);
  border: 1px solid var(--aip-glass-border);
  border-radius: var(--aip-radius-full);
  color: var(--aip-text-primary);
  padding: 9px 14px 9px 38px;
  font-family: var(--aip-font-mono);
  font-size: var(--aip-fs-sm);
  outline: none;
  transition: all var(--aip-dur-fast) var(--aip-ease-out);
}
.ws-search input::placeholder { color: var(--aip-text-dim); }
.ws-search.focused input,
.ws-search input:focus {
  border-color: var(--aip-brand);
  background: #FFFFFF;
}
.ws-search.focused .search-ic,
.ws-search input:focus ~ .search-ic { color: var(--aip-brand); }

.ws-user {
  font-family: var(--aip-font-mono);
  font-size: var(--aip-fs-xs);
  display: inline-flex; align-items: center; gap: var(--aip-s-2);
  color: var(--aip-text-primary);
  padding: 7px 14px;
  background: #FFFFFF;
  border: 1px solid var(--aip-glass-border);
  border-radius: var(--aip-radius-full);
}
.ws-user .dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--aip-ok);
}
.ws-user .role-pill {
  font-family: var(--aip-font-mono);
  font-size: 10px;
  letter-spacing: 0.10em;
  padding: 2px 6px;
  background: rgba(0, 102, 204, 0.06);
  border: 1px solid rgba(0, 102, 204, 0.20);
  border-radius: var(--aip-radius-full);
  color: var(--aip-brand);
  text-transform: uppercase;
}

/* Sidebar tip card (shortcuts) */
.side-tip {
  margin-top: auto;
  padding: var(--aip-s-4);
  background: var(--aip-bg-base);
  border: 1px solid var(--aip-glass-border);
  border-radius: var(--aip-radius-md);
  font-size: var(--aip-fs-xs);
  color: var(--aip-text-secondary);
}
.side-tip .tip-title {
  font-family: var(--aip-font-mono);
  font-size: var(--aip-fs-xs);
  letter-spacing: 0.10em;
  color: var(--aip-brand);
  margin-bottom: var(--aip-s-2);
}
.tip-row {
  display: flex; align-items: center; gap: var(--aip-s-2);
  padding: 4px 0;
}
.tip-row kbd {
  font-family: var(--aip-font-mono);
  font-size: 10px;
  padding: 1px 5px;
  background: #FFFFFF;
  border: 1px solid var(--aip-glass-border);
  border-radius: var(--aip-radius-xs);
  color: var(--aip-text-primary);
  line-height: 1;
}
.tip-row span { margin-left: auto; }

/* Body grid */
.ws-body {
  display: grid;
  grid-template-columns: 240px 1fr;
  min-height: calc(100vh - 57px);
}

/* Sidebar — light frosted */
.ws-side {
  border-right: 1px solid var(--aip-glass-border);
  padding: var(--aip-s-6) var(--aip-s-3);
  background: var(--aip-bg-base);
  display: flex;
  flex-direction: column;
}
.side-section { margin-bottom: var(--aip-s-8); }
.side-title {
  font-family: var(--aip-font-mono);
  font-size: var(--aip-fs-xs);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--aip-text-secondary);
  padding: 0 var(--aip-s-3) var(--aip-s-2);
}
.side-item {
  display: flex; align-items: center; gap: var(--aip-s-3);
  width: 100%;
  padding: var(--aip-s-2) var(--aip-s-3);
  background: transparent;
  border: 1px solid transparent;
  font-family: var(--aip-font-mono);
  font-size: var(--aip-fs-sm);
  color: var(--aip-text-secondary);
  text-align: left; cursor: pointer;
  border-radius: var(--aip-radius-md);
  transition: all var(--aip-dur-fast) var(--aip-ease-out);
}
.side-item:hover {
  color: var(--aip-text-primary);
  background: #FFFFFF;
  border-color: var(--aip-glass-border);
}
.side-item.active {
  color: var(--aip-brand);
  background: rgba(0, 102, 204, 0.06);
  border-color: rgba(0, 102, 204, 0.30);
}
.side-item .ic {
  font-size: 14px; width: 16px; text-align: center;
  transition: color var(--aip-dur-fast) var(--aip-ease-out);
}
.side-item .count {
  margin-left: auto;
  font-size: var(--aip-fs-xs);
  background: #FFFFFF;
  border: 1px solid var(--aip-glass-border);
  border-radius: var(--aip-radius-xs);
  padding: 1px 6px;
  color: var(--aip-text-secondary);
}
.side-item-static {
  display: block;
  padding: var(--aip-s-1) var(--aip-s-3);
  font-family: var(--aip-font-mono);
  font-size: var(--aip-fs-sm);
  color: var(--aip-text-secondary);
  text-decoration: none;
  border-radius: var(--aip-radius-md);
  transition: color var(--aip-dur-fast) var(--aip-ease-out);
}
.side-item-static:hover { color: var(--aip-brand); }

/* Main */
.ws-main { padding: var(--aip-s-10) var(--aip-s-10) var(--aip-s-20); max-width: 1280px; }
.hello { margin-bottom: var(--aip-s-12); }
.hello h1 {
  font-size: var(--aip-fs-3xl);
  font-weight: 700;
  margin: 0 0 var(--aip-s-2);
  letter-spacing: -0.02em;
  color: var(--aip-text-primary);
}
.hello p { font-size: var(--aip-fs-base); color: var(--aip-text-secondary); margin: 0; }

.group { margin-bottom: var(--aip-s-12); }
.group-head {
  display: flex; align-items: baseline; gap: var(--aip-s-3);
  padding-bottom: var(--aip-s-3);
  margin-bottom: var(--aip-s-5);
  border-bottom: 1px solid var(--aip-glass-border);
}
.group-head .g-name { font-size: var(--aip-fs-lg); font-weight: 600; letter-spacing: -0.01em; }
.group-head .g-count {
  font-family: var(--aip-font-mono);
  font-size: var(--aip-fs-xs);
  color: var(--aip-text-secondary);
  letter-spacing: 0.04em;
}
.group-empty {
  font-family: var(--aip-font-mono);
  font-size: var(--aip-fs-sm);
  color: var(--aip-text-secondary);
  padding: var(--aip-s-6);
  background: var(--aip-bg-base);
  border: 1px dashed var(--aip-glass-border-hi);
  border-radius: var(--aip-radius-md);
  text-align: center;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--aip-s-4);
}

/* Tool card — solid white on light theme */
.tcard {
  background: #FFFFFF;
  border: 1px solid var(--aip-glass-border);
  border-radius: var(--aip-radius-lg);
  padding: var(--aip-s-5);
  cursor: pointer;
  transition: all var(--aip-dur-base) var(--aip-ease-out);
  display: flex; flex-direction: column; gap: var(--aip-s-3);
  position: relative;
  overflow: hidden;
}
.tcard::before {
  content: '';
  position: absolute; top: 0; left: 0; bottom: 0;
  width: 3px;
  background: var(--aip-neon-2);
  transform: scaleY(0);
  transform-origin: top;
  transition: transform var(--aip-dur-slow) var(--aip-ease-out);
}
.tcard:hover {
  border-color: rgba(0, 102, 204, 0.30);
  transform: translateY(-3px);
}
.tcard:hover::before { transform: scaleY(1); }

.tcard-head { display: flex; align-items: center; gap: var(--aip-s-3); }
.tcard-icon {
  font-family: var(--aip-font-mono);
  font-size: 16px;
  width: 36px; height: 36px;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: var(--aip-radius-md);
  border: 1px solid currentColor;
  flex-shrink: 0;
}
.tcard-title { flex: 1; min-width: 0; }
.tcard-title .t {
  font-family: var(--aip-font-mono);
  font-size: var(--aip-fs-base);
  font-weight: 500;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.tcard-title .kind {
  font-family: var(--aip-font-mono);
  font-size: var(--aip-fs-xs);
  letter-spacing: 0.10em;
  color: var(--aip-text-secondary);
  text-transform: uppercase;
}
.tcard-status {
  width: 8px; height: 8px; border-radius: 50%;
  flex-shrink: 0;
}
.tcard-desc {
  font-size: var(--aip-fs-sm);
  color: var(--aip-text-secondary);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.tcard-foot {
  display: flex; justify-content: space-between; align-items: center;
  padding-top: var(--aip-s-2);
  margin-top: auto;
  border-top: 1px dashed var(--aip-glass-border);
  font-family: var(--aip-font-mono);
  font-size: var(--aip-fs-xs);
  color: var(--aip-text-secondary);
}
.tcard-foot .open { color: var(--aip-brand); }

@media (max-width: 1024px) {
  .ws-body { grid-template-columns: 200px 1fr; }
  .ws-main { padding: var(--aip-s-8); }
}
@media (max-width: 640px) {
  .ws-body { grid-template-columns: 1fr; }
  .ws-side { display: none; }
  .ws-search { max-width: none; }
}
</style>