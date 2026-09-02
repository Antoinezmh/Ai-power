<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vitepress'
import { auth } from '../auth'

const route = useRoute()
const router = useRouter()

const username = ref('demo')
const password = ref('demo123')
const loading = ref(false)
const error = ref('')
const rememberMe = ref(true)
const focused = ref<string | null>(null)

const submit = async () => {
  if (loading.value) return
  error.value = ''
  loading.value = true
  const r = await auth.login(username.value, password.value)
  loading.value = false
  if (r.ok) {
    const redirect = new URLSearchParams(location.search).get('redirect') || '/app/'
    router.go(redirect)
  } else {
    error.value = r.error || '登录失败'
  }
}

onMounted(() => {
  auth.init()
  if (auth.isAuthenticated.value) router.go('/app/')
  // Break out of VitePress default `.content` (752px) and `.container` (992px) caps
  // so the split-screen layout can use the full viewport width.
  document.querySelectorAll('.content, .container, .VPDoc, .vp-doc').forEach((el) => {
    const cs = getComputedStyle(el)
    if (cs.maxWidth && cs.maxWidth !== 'none') el.style.maxWidth = 'none'
    if (cs.width && cs.width !== 'auto' && parseInt(cs.width) < window.innerWidth) el.style.width = '100%'
    if (cs.padding && el.classList.contains('VPDoc') || el.classList.contains('vp-doc')) el.style.padding = '0'
  })
})

const copied = ref<string | null>(null)
const copy = async (txt: string) => {
  try {
    await navigator.clipboard.writeText(txt)
    copied.value = txt
    setTimeout(() => { if (copied.value === txt) copied.value = null }, 1500)
  } catch {
    /* clipboard might be blocked; no-op */
  }
}

// ---------- Marketing / showcase content (right pane) ----------

const awards = [
  {
    rank: '01',
    badge: '★',
    name: 'MOSFET FoM Calculator',
    kind: 'Web 工具',
    reason: '被 12 位工程师设为收藏，季度调用量 1.2k 次',
    by: '工具评审委员会 · 2026 Q2',
    accent: 'var(--aip-brand)',
  },
  {
    rank: '02',
    badge: '◆',
    name: 'TCAD 参数自动校准',
    kind: 'Web 工具',
    reason: '把 3 天人工校准压缩到 18 分钟',
    by: '建模小组提名 · 2026 Q2',
    accent: 'var(--aip-violet)',
  },
  {
    rank: '03',
    badge: '●',
    name: '功率循环寿命外推',
    kind: 'CLI 工具',
    reason: '从 PC 试验到寿命预测全自动，首发即被引用',
    by: '可靠性小组提名 · 2026 Q2',
    accent: 'var(--aip-accent)',
  },
]

const activity = [
  { who: '张工', what: '把 SOARunner 接入了产线看板', when: '12 分钟前' },
  { who: '李工', what: '更新了 SPICE subckt 提取的 corner 库', when: '2 小时前' },
  { who: '陈工', what: '把 FoM 计算结果写进季度复盘', when: '昨天 16:40' },
  { who: '王工', what: '新提交了 GaN HEMT 寿命模型', when: '昨天 11:02' },
  { who: '周工', what: '为 HTOL/HTRB 监测加入了预警阈值', when: '2 天前' },
]

const highlights = [
  {
    label: '本季新增',
    title: 'GaN HEMT FoM 模块',
    desc: '针对 100V/650V GaN 器件的 FoM 估算与 Ron,sp 折算',
    accent: 'var(--aip-brand)',
  },
  {
    label: '即将上线',
    title: '失效分析知识库',
    desc: '12 类常见失效模式、归因与对策，工程师可共建',
    accent: 'var(--aip-violet)',
  },
  {
    label: '试用反馈',
    title: '"把测试数据 → 报告" 节省一上午',
    desc: '来自建模组 · 用于评审前的快速数据对齐',
    accent: 'var(--aip-accent)',
  },
]
</script>

<template>
  <div class="login-page">
    <div class="bg-deco" aria-hidden="true">
      <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
              <defs>
                <pattern id="lp" width="48" height="48" patternUnits="userSpaceOnUse">
                  <path d="M 48 0 L 0 0 48 48Z" fill="none" stroke="rgba(0, 102, 204, 0.06)" stroke-width="1"/>
                </pattern>
              </defs>
              <rect width="1440" height="900" fill="url(#lp)"/>
            </svg>
    </div>

    <div class="login-shell">
      <!-- ============== LEFT: login ============== -->
      <section class="lp-left">
        <a class="login-brand" href="/">
          <span class="mark">⏚</span>
          <span class="name">Ai Power</span>
        </a>
        <a class="login-back" href="/">← 返回公开页</a>

        <div class="login-card" :class="{ 'is-focused': focused }">
          <div class="login-head">
            <div class="aip-eyebrow">SIGN IN</div>
            <h1>登录部门工具台</h1>
            <p class="sub">使用部门账号进入。只限部门同事。</p>
          </div>

          <form class="login-form" @submit.prevent="submit">
            <label class="field" :class="{ focused: focused === 'user' }">
              <span class="lbl">用户名</span>
              <input
                v-model="username"
                type="text"
                autocomplete="username"
                required
                @focus="focused = 'user'"
                @blur="focused = null"
              />
            </label>
            <label class="field" :class="{ focused: focused === 'pass' }">
              <span class="lbl">密码</span>
              <input
                v-model="password"
                type="password"
                autocomplete="current-password"
                required
                @focus="focused = 'pass'"
                @blur="focused = null"
              />
            </label>

            <div class="opts">
              <label class="check"><input type="checkbox" v-model="rememberMe" />保持登录状态</label>
              <a href="#" class="forgot">忘记密码？</a>
            </div>

            <button type="submit" class="aip-btn-primary lg submit" :disabled="loading">
              <span v-if="loading">登录中...</span>
              <span v-else>登录 →</span>
            </button>

            <Transition name="err">
              <div v-if="error" class="err-msg">✖ {{ error }}</div>
            </Transition>
          </form>

          <div class="demo-hint">
            <div class="dh-title">默认账号</div>
            <button type="button" class="dh-row" @click="copy('demo')">
              <span class="k">用户名</span><code>demo</code>
              <span class="dh-copy">{{ copied === 'demo' ? '已复制 ✓' : '复制' }}</span>
            </button>
            <button type="button" class="dh-row" @click="copy('demo123')">
              <span class="k">密码</span><code>demo123</code>
              <span class="dh-copy">{{ copied === 'demo123' ? '已复制 ✓' : '复制' }}</span>
            </button>
            <div class="dh-note">仅供内部演示。生产部署需接 LDAP 或 SSO。</div>
          </div>
        </div>

        <div class="lp-foot">
                  <div class="lp-foot-row">
                    <span class="lp-foot-dot" />
                    <span>已有 <strong>87</strong> 位同事登录过 · 本周 <strong>240+</strong> 次调用</span>
                  </div>
                  <div class="lp-foot-copy">© 2026 功率器件研发部 · 内部资料</div>
                </div>
      </section>

      <!-- ============== RIGHT: showcase ============== -->
      <aside class="lp-right">
        <div class="lp-right-inner">
          <div class="aip-eyebrow">SHOWCASE · 本季精选</div>
          <h2 class="lp-headline">
            被嘉奖的 <span class="accent">工具</span>，
            <br/>由 <span class="accent">用它们的人</span> 选出。
          </h2>
          <p class="lp-sub">
            部门工具台 28 个工具里，本季调用量与口碑最好的 3 个。我们也把你同事最近的活动与即将上线的能力放在这里——登录即可进入完整工具台。
          </p>

          <!-- 嘉奖榜 -->
          <div class="awards">
            <div
              v-for="a in awards"
              :key="a.rank"
              class="award-card"
              :style="{ '--accent': a.accent }"
            >
              <div class="award-rank">{{ a.rank }}</div>
              <div class="award-body">
                <div class="award-head">
                  <span class="award-name">{{ a.name }}</span>
                  <span class="award-kind">{{ a.kind }}</span>
                </div>
                <div class="award-reason">{{ a.reason }}</div>
                <div class="award-by">
                  <span class="award-badge">{{ a.badge }}</span>
                  {{ a.by }}
                </div>
              </div>
            </div>
          </div>

          <!-- 同事活动 -->
          <div class="activity">
            <div class="block-eyebrow">同事最近 · LIVE</div>
            <div class="activity-list">
              <div v-for="(it, idx) in activity" :key="idx" class="activity-row">
                <span class="activity-dot" />
                <span class="activity-who">{{ it.who }}</span>
                <span class="activity-what">{{ it.what }}</span>
                <span class="activity-when">{{ it.when }}</span>
              </div>
            </div>
          </div>

          <!-- 三张小卡片 -->
          <div class="highlights">
            <div
              v-for="h in highlights"
              :key="h.title"
              class="hl-card"
              :style="{ '--accent': h.accent }"
            >
              <div class="hl-label">{{ h.label }}</div>
              <div class="hl-title">{{ h.title }}</div>
              <div class="hl-desc">{{ h.desc }}</div>
            </div>
          </div>

          <div class="lp-foot-mini">
            登录后查看全部 28 个工具 · 7 个 Gate · 季度复盘数据
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  position: relative;
  min-height: 100vh;
  display: block;
  background: var(--aip-bg-base);
  overflow-x: hidden;
}
.bg-deco { position: fixed; inset: 0; z-index: 0; pointer-events: none; }

/* Two-column shell — fixed-ish min height, scrolls within if too small */
.login-shell {
  position: relative; z-index: 1;
  display: grid;
  grid-template-columns: 520px 1fr;
  min-height: 100vh;
  width: 100%;
}
.login-shell > * { min-width: 0; }

/* ============================================================
   LEFT — login column
   ============================================================ */
.lp-left {
  position: relative;
  display: flex; flex-direction: column;
  padding: var(--aip-s-5) var(--aip-s-10) var(--aip-s-8);
  border-right: 1px solid var(--aip-glass-border);
  background: var(--aip-bg-base);
}

/* Push the footer to the bottom of the column */
.lp-foot { margin-top: auto; }

.login-brand {
  display: inline-flex; align-items: center; gap: var(--aip-s-3);
  font-family: var(--aip-font-mono);
  font-size: var(--aip-fs-md);
  font-weight: 600;
  color: var(--aip-text-primary);
  text-decoration: none;
}
.login-brand .mark {
  display: inline-flex; align-items: center; justify-content: center;
  width: 36px; height: 36px;
  font-size: 18px;
  background: #FFFFFF;
  border: 1px solid var(--aip-glass-border-hi);
  border-radius: var(--aip-radius-sm);
  color: var(--aip-brand);
}

.login-back {
  position: absolute; top: var(--aip-s-8); right: var(--aip-s-10);
  font-family: var(--aip-font-mono);
  font-size: var(--aip-fs-sm);
  color: var(--aip-text-secondary);
  text-decoration: none;
  transition: color var(--aip-dur-fast) var(--aip-ease-out);
}
.login-back:hover { color: var(--aip-brand); }

.login-card {
  width: 100%; max-width: 490px;
  margin: var(--aip-s-4) 0 0;
  padding: var(--aip-s-8) var(--aip-s-8);
  background: #FFFFFF;
  border: 1px solid var(--aip-glass-border);
  border-radius: var(--aip-radius-xl);
  transition: border-color var(--aip-dur-base) var(--aip-ease-out),
              box-shadow var(--aip-dur-base) var(--aip-ease-out);
}
.login-card.is-focused {
  border-color: var(--aip-text-primary);
}

.login-head { margin-bottom: var(--aip-s-8); }
.login-head h1 {
  font-size: var(--aip-fs-2xl);
  font-weight: 700;
  margin: var(--aip-s-3) 0 var(--aip-s-2);
  letter-spacing: -0.01em;
  color: var(--aip-text-primary);
}
.login-head .sub {
  font-size: var(--aip-fs-sm);
  color: var(--aip-text-secondary);
  margin: 0;
}

.login-form { display: flex; flex-direction: column; gap: var(--aip-s-4); }
.field { display: flex; flex-direction: column; gap: var(--aip-s-2); transition: all var(--aip-dur-fast) var(--aip-ease-out); }
.field .lbl {
  font-family: var(--aip-font-mono);
  font-size: var(--aip-fs-xs);
  letter-spacing: 0.08em;
  color: var(--aip-text-secondary);
  text-transform: uppercase;
}
.field input {
  background: var(--aip-bg-base);
  border: 1px solid var(--aip-glass-border);
  border-radius: var(--aip-radius-md);
  color: var(--aip-text-primary);
  padding: var(--aip-s-3) var(--aip-s-4);
  font-family: var(--aip-font-ui);
  font-size: var(--aip-fs-base);
  outline: none;
  transition: all var(--aip-dur-fast) var(--aip-ease-out);
}
.field input::placeholder { color: var(--aip-text-dim); }
.field input:focus,
.field.focused input {
  border-color: var(--aip-brand);
  background: #FFFFFF;
}

.opts {
  display: flex; justify-content: space-between; align-items: center;
  font-size: var(--aip-fs-sm);
  color: var(--aip-text-secondary);
}
.check { display: inline-flex; align-items: center; gap: var(--aip-s-2); cursor: pointer; }
.check input { accent-color: var(--aip-brand); }
.forgot { color: var(--aip-brand); text-decoration: none; }
.forgot:hover { text-decoration: underline; }

.submit { justify-content: center; margin-top: var(--aip-s-2); width: 100%; }
.submit:disabled { opacity: 0.5; cursor: not-allowed; }

.err-msg {
  font-family: var(--aip-font-mono);
  font-size: var(--aip-fs-sm);
  color: #B91C1C;
  background: #FEF2F2;
  border: 1px solid #FECACA;
  border-radius: var(--aip-radius-md);
  padding: var(--aip-s-3) var(--aip-s-4);
}

.demo-hint {
  margin-top: var(--aip-s-6);
  padding: var(--aip-s-4);
  background: var(--aip-bg-base);
  border: 1px dashed var(--aip-glass-border-hi);
  border-radius: var(--aip-radius-md);
}
.dh-title {
  font-family: var(--aip-font-mono);
  font-size: var(--aip-fs-xs);
  color: var(--aip-text-secondary);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: var(--aip-s-2);
}
.dh-row {
  display: flex; gap: var(--aip-s-3); align-items: center;
  padding: var(--aip-s-1) var(--aip-s-2);
  background: transparent;
  border: none;
  width: 100%;
  text-align: left;
  cursor: pointer;
  border-radius: var(--aip-radius-xs);
  transition: background var(--aip-dur-fast) var(--aip-ease-out);
}
.dh-row:hover { background: rgba(0, 102, 204, 0.04); }
.dh-row .k {
  font-family: var(--aip-font-mono);
  font-size: var(--aip-fs-xs);
  color: var(--aip-text-secondary);
  width: 56px;
}
.dh-row code {
  font-family: var(--aip-font-mono);
  font-size: var(--aip-fs-sm);
  color: var(--aip-accent);
  background: #FFFFFF;
  padding: 3px 8px;
  border-radius: var(--aip-radius-xs);
  border: 1px solid var(--aip-glass-border);
}
.dh-copy {
  margin-left: auto;
  font-family: var(--aip-font-mono);
  font-size: var(--aip-fs-xs);
  color: var(--aip-text-secondary);
  opacity: 0.7;
}
.dh-row:hover .dh-copy { opacity: 1; color: var(--aip-brand); }
.dh-note { font-size: var(--aip-fs-xs); color: var(--aip-text-secondary); margin-top: var(--aip-s-2); line-height: 1.5; }

.lp-foot {
  font-family: var(--aip-font-mono);
  font-size: var(--aip-fs-xs);
  color: var(--aip-text-dim);
  display: flex; flex-direction: column;
  gap: var(--aip-s-2);
}
.lp-foot-row {
  display: inline-flex; align-items: center;
  gap: var(--aip-s-2);
  color: var(--aip-text-secondary);
  letter-spacing: 0.02em;
}
.lp-foot-row strong {
  color: var(--aip-text-primary);
  font-weight: 600;
  font-family: var(--aip-font-mono);
  font-variant-numeric: tabular-nums;
}
.lp-foot-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--aip-ok);
  animation: lp-fb-pulse 2.4s infinite;
}
@keyframes lp-fb-pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.4 } }
.lp-foot-copy {
  color: var(--aip-text-dim);
  letter-spacing: 0.04em;
}

/* ============================================================
   RIGHT — showcase column
   ============================================================ */
.lp-right {
  position: relative;
  padding: var(--aip-s-12) var(--aip-s-10);
  overflow: hidden;
  min-width: 0;
}
.lp-right::before {
  content: '';
  position: absolute;
  top: -10%; right: -20%;
  width: 600px; height: 600px;
  display: none;
  z-index: 0;
  pointer-events: none;
}
.lp-right-inner {
  position: relative; z-index: 1;
  max-width: 640px;
  width: 100%;
  min-width: 0;
  margin: 0 auto;
  display: flex; flex-direction: column;
  gap: var(--aip-s-8);
}

.lp-headline {
  font-size: var(--aip-fs-3xl);
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: -0.025em;
  margin: var(--aip-s-4) 0 var(--aip-s-3);
  color: var(--aip-text-primary);
}
.lp-headline .accent {
  color: var(--aip-text-link);
}

.lp-sub {
  font-size: var(--aip-fs-base);
  color: var(--aip-text-secondary);
  line-height: 1.65;
  margin: 0;
  max-width: 540px;
}

/* Awards — top 3 cards */
.awards {
  display: flex; flex-direction: column;
  gap: var(--aip-s-3);
}
.award-card {
  display: flex; align-items: stretch;
  background: var(--aip-bg-elevated);
  border: 1px solid var(--aip-glass-border);
  border-radius: var(--aip-radius-lg);
  overflow: hidden;
  transition: transform var(--aip-dur-base) var(--aip-ease-out),
              box-shadow var(--aip-dur-base) var(--aip-ease-out);
}
.award-card:hover {
  transform: translateY(-2px);
  border-color: rgba(0, 102, 204, 0.30);
}
.award-rank {
  flex-shrink: 0;
  width: 80px;
  display: flex; align-items: center; justify-content: center;
  font-family: var(--aip-font-mono);
  font-size: 32px;
  font-weight: 700;
  color: var(--accent, var(--aip-brand));
  background: var(--aip-bg-alt);
  border-right: 1px solid var(--aip-glass-border);
}
.award-body {
  flex: 1; min-width: 0;
  padding: var(--aip-s-4) var(--aip-s-5);
  display: flex; flex-direction: column;
  gap: 4px;
}
.award-head {
  display: flex; align-items: baseline; gap: var(--aip-s-3);
  flex-wrap: wrap;
}
.award-name {
  font-size: var(--aip-fs-lg);
  font-weight: 600;
  color: var(--aip-text-primary);
}
.award-kind {
  font-family: var(--aip-font-mono);
  font-size: var(--aip-fs-xs);
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: var(--accent, var(--aip-brand));
  padding: 2px 6px;
  border: 1px solid color-mix(in srgb, var(--accent, var(--aip-brand)) 30%, transparent);
  border-radius: var(--aip-radius-xs);
  background: color-mix(in srgb, var(--accent, var(--aip-brand)) 8%, transparent);
}
.award-reason {
  font-size: var(--aip-fs-sm);
  color: var(--aip-text-secondary);
  line-height: 1.55;
}
.award-by {
  font-family: var(--aip-font-mono);
  font-size: var(--aip-fs-xs);
  color: var(--aip-text-dim);
  margin-top: var(--aip-s-1);
  display: inline-flex; align-items: center; gap: 6px;
}
.award-badge {
  display: inline-flex; align-items: center; justify-content: center;
  width: 18px; height: 18px;
  font-size: 12px;
  border-radius: 50%;
  color: #FFFFFF;
  background: var(--accent, var(--aip-brand));
}

/* Activity timeline */
.activity {
  display: flex; flex-direction: column;
  gap: var(--aip-s-3);
}
.block-eyebrow {
  font-family: var(--aip-font-mono);
  font-size: var(--aip-fs-xs);
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--aip-text-dim);
  display: inline-flex; align-items: center; gap: var(--aip-s-2);
}
.block-eyebrow::before {
  content: '';
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--aip-ok);
  animation: lp-pulse 2s infinite;
}
@keyframes lp-pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.4 } }

.activity-list {
  position: relative;
  display: flex; flex-direction: column;
  padding-left: var(--aip-s-6);
  border-left: 1px dashed var(--aip-glass-border-hi);
  margin-left: 6px;
}
.activity-row {
  display: flex; align-items: baseline; gap: var(--aip-s-3);
  padding: var(--aip-s-2) 0;
  font-size: var(--aip-fs-sm);
  position: relative;
}
.activity-row .activity-dot {
  position: absolute;
  left: calc(-1 * var(--aip-s-6) + 4px);
  top: 14px;
  width: 8px; height: 8px;
  border-radius: 50%;
  background: var(--aip-brand);
}
.activity-who {
  font-family: var(--aip-font-mono);
  font-weight: 600;
  color: var(--aip-text-primary);
  flex-shrink: 0;
  min-width: 56px;
}
.activity-what {
  color: var(--aip-text-secondary);
  flex: 1; min-width: 0;
  line-height: 1.5;
}
.activity-when {
  font-family: var(--aip-font-mono);
  font-size: var(--aip-fs-xs);
  color: var(--aip-text-dim);
  flex-shrink: 0;
}

/* Highlight cards — 3 small tiles */
.highlights {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--aip-s-3);
}
.hl-card {
  background: var(--aip-bg-elevated);
  border: 1px solid var(--aip-glass-border);
  border-radius: var(--aip-radius-md);
  padding: var(--aip-s-4);
  display: flex; flex-direction: column;
  gap: var(--aip-s-2);
  position: relative;
  overflow: hidden;
  transition: transform var(--aip-dur-base) var(--aip-ease-out);
}
.hl-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0; height: 3px;
  background: var(--accent, var(--aip-brand));
}
.hl-card:hover { transform: translateY(-2px); }
.hl-label {
  font-family: var(--aip-font-mono);
  font-size: var(--aip-fs-xs);
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: var(--accent, var(--aip-brand));
  margin-top: var(--aip-s-1);
}
.hl-title {
  font-size: var(--aip-fs-base);
  font-weight: 600;
  color: var(--aip-text-primary);
  line-height: 1.35;
}
.hl-desc {
  font-size: var(--aip-fs-xs);
  color: var(--aip-text-secondary);
  line-height: 1.55;
}

.lp-foot-mini {
  font-family: var(--aip-font-mono);
  font-size: var(--aip-fs-xs);
  color: var(--aip-text-dim);
  text-align: center;
  padding-top: var(--aip-s-3);
  border-top: 1px dashed var(--aip-glass-border);
}

/* ============================================================
   Responsive
   ============================================================ */
@media (max-width: 960px) {
  .login-shell {
    grid-template-columns: 1fr;
  }
  .lp-left {
    border-right: none;
    border-bottom: 1px solid var(--aip-glass-border);
    padding: var(--aip-s-6) var(--aip-s-6);
  }
  .login-back {
    position: static;
    display: inline-block;
    margin-top: var(--aip-s-3);
  }
  .lp-right {
    padding: var(--aip-s-8) var(--aip-s-6);
  }
  .highlights {
    grid-template-columns: 1fr;
  }
}

.err-enter-active, .err-leave-active { transition: all var(--aip-dur-base) var(--aip-ease-out); }
.err-enter-from, .err-leave-to { opacity: 0; transform: translateY(-4px); }
</style>