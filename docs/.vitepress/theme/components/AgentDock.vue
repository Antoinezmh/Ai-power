<script setup lang="ts">
import { ref, nextTick, onMounted, onUnmounted } from 'vue'
import { auth } from '../auth'

interface Msg {
  role: 'user' | 'assistant' | 'system'
  content: string
  ts: number
}

const open = ref(false)
const input = ref('')
const sending = ref(false)
const messages = ref<Msg[]>([
  { role: 'system', content: '你是 Ai Power 助手。有问题直接问。', ts: Date.now() },
])
const listEl = ref<HTMLElement | null>(null)
const fabVisible = ref(true)

const onScroll = () => {
  // Hide FAB on downward scroll, show on upward
  const y = window.scrollY
  const last = (onScroll as any)._last ?? 0
  ;(onScroll as any)._last = y
  if (open.value) return // never hide while panel open
  fabVisible.value = y < 80 || y < last
}

const scroll = () => nextTick(() => {
  if (listEl.value) listEl.value.scrollTop = listEl.value.scrollHeight
})

const send = async () => {
  const text = input.value.trim()
  if (!text || sending.value) return
  input.value = ''
  messages.value.push({ role: 'user', content: text, ts: Date.now() })
  scroll()
  sending.value = true
  try {
    const base = import.meta.env.BASE_URL || '/'
    const res = await fetch(`${base}api/agent/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth.state.token}`,
      },
      body: JSON.stringify({ messages: messages.value.filter(m => m.role !== 'system').slice(-10) }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`)
    messages.value.push({ role: 'assistant', content: data.reply, ts: Date.now() })
  } catch (e: any) {
    messages.value.push({ role: 'assistant', content: '⚠ ' + (e.message || '错误') + '。请检查 OPENAI_API_KEY 是否配置。', ts: Date.now() })
  } finally {
    sending.value = false
    scroll()
  }
}

const presets = [
  { icon: '⏚', text: '帮我计算 SiC MOSFET Ron,sp' },
  { icon: '⎞', text: '怎么从双脉冲测试拿 Eon/Eoff？' },
  { icon: '⌛', text: '功率循环寿命预测的公式是什么？' },
]

onMounted(() => {
  auth.init()
  window.addEventListener('scroll', onScroll, { passive: true })
})
onUnmounted(() => window.removeEventListener('scroll', onScroll))
</script>

<template>
  <div class="agent">
    <Transition name="fade-up">
      <button v-if="!open && fabVisible" class="agent-fab" @click="open = true" title="AI 助手">
        <span class="dot-pulse" />
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="6" width="18" height="12" rx="3" stroke="currentColor" stroke-width="1.5"/>
          <circle cx="9" cy="12" r="1.5" fill="currentColor"/>
          <circle cx="15" cy="12" r="1.5" fill="currentColor"/>
          <line x1="12" y1="3" x2="12" y2="6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </button>
    </Transition>

    <Transition name="slide-up">
      <div v-if="open" class="agent-panel">
        <header class="panel-head">
          <div class="title">
            <span class="ai-mark">Ω</span>
            <span>Ai Power 助手</span>
            <span class="badge">BETA</span>
          </div>
          <div class="head-actions">
            <button class="icon-btn" @click="messages = [{ role: 'system', content: '你是 Ai Power 助手。', ts: Date.now() }]" title="清除">↻</button>
            <button class="icon-btn" @click="open = false" title="关闭">✕</button>
          </div>
        </header>
        <div v-if="auth.state.user" class="panel-context">
          <span class="ctx-dot" />
          为 <strong>{{ auth.state.user.displayName }}</strong> 服务中 · 上下文已隔离
        </div>

        <div class="panel-body" ref="listEl">
          <div v-for="(m, i) in messages.filter(x => x.role !== 'system')" :key="i" :class="['msg', m.role]">
            <div class="avatar">{{ m.role === 'user' ? '你' : 'AI' }}</div>
            <div class="bubble">
              <div class="content" v-html="m.content.replace(/\n/g, '<br>')"></div>
            </div>
          </div>
          <div v-if="messages.filter(x => x.role !== 'system').length === 0" class="empty">
            <div class="empty-title">你好，我是 Ai Power 助手</div>
            <div class="empty-sub">问任何关于功率器件设计的问题，或者让我帮你调用工具。</div>
            <div class="presets">
              <button v-for="p in presets" :key="p.text" class="preset" @click="input = p.text; send()">
                <span>{{ p.icon }}</span> {{ p.text }}
              </button>
            </div>
          </div>
          <div v-if="sending" class="msg assistant">
            <div class="avatar">AI</div>
            <div class="bubble"><div class="content"><span class="typing"><span /><span /><span /></span></div></div>
          </div>
        </div>

        <footer class="panel-foot">
          <textarea
            v-model="input"
            placeholder="输入问题，Enter 发送，Shift+Enter 换行"
            rows="1"
            @keydown.enter.exact.prevent="send"
            @keydown.enter.shift.exact.prevent="input += '\n'"
          />
          <button class="send" :disabled="sending || !input.trim()" @click="send">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </footer>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.agent { position: fixed; bottom: var(--aip-s-6); right: var(--aip-s-6); z-index: 100; }

/* Neon FAB */
.agent-fab {
  position: relative;
  width: 60px; height: 60px;
  border-radius: 50%;
  background: var(--aip-neon-1);
  color: #FFFFFF;
  border: none;
  cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center;
  box-shadow:
    0 8px 32px rgba(91, 108, 255, 0.45),
    0 0 0 0 rgba(91, 108, 255, 0);
  transition: all var(--aip-dur-base) var(--aip-ease-out);
}
.agent-fab:hover {
  transform: scale(1.06);
  box-shadow:
    0 12px 40px rgba(91, 108, 255, 0.55),
    0 0 0 8px rgba(91, 108, 255, 0.10);
}
.agent-fab .dot-pulse {
  position: absolute; top: 10px; right: 10px;
  width: 8px; height: 8px; border-radius: 50%;
  background: var(--aip-bg-base);
  box-shadow: 0 0 0 2px var(--aip-accent);
  animation: pulse 1.5s infinite;
}
@keyframes pulse { 0%,100% { opacity:1; transform: scale(1); } 50% { opacity:0.5; transform: scale(0.85); } }

/* Glass panel */
.agent-panel {
  width: 420px;
  height: 600px;
  max-height: calc(100vh - 48px);
  background: var(--aip-glass-3);
  backdrop-filter: blur(24px) saturate(170%);
  -webkit-backdrop-filter: blur(24px) saturate(170%);
  border: 1px solid var(--aip-glass-border-hi);
  border-radius: var(--aip-radius-xl);
  box-shadow:
    0 24px 72px rgba(0, 0, 0, 0.6),
    0 0 32px rgba(91, 108, 255, 0.15);
  display: flex; flex-direction: column;
  overflow: hidden;
}

.panel-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: var(--aip-s-4);
  border-bottom: 1px solid var(--aip-glass-border);
  background: var(--aip-glass-2);
}
.title {
  display: inline-flex; align-items: center; gap: var(--aip-s-2);
  font-family: var(--aip-font-mono);
  font-size: var(--aip-fs-sm);
  font-weight: 600;
}
.ai-mark {
  display: inline-flex; align-items: center; justify-content: center;
  width: 24px; height: 24px;
  background: var(--aip-neon-1);
  color: #FFFFFF;
  border-radius: var(--aip-radius-xs);
  font-size: 13px;
  font-weight: 700;
}
.badge {
  font-family: var(--aip-font-mono);
  font-size: 9px;
  background: rgba(245, 158, 11, 0.15);
  color: var(--aip-warn);
  padding: 2px 6px;
  border-radius: var(--aip-radius-xs);
  letter-spacing: 0.06em;
}
.head-actions { display: flex; gap: var(--aip-s-1); }
.icon-btn {
  width: 28px; height: 28px;
  background: transparent;
  border: 1px solid var(--aip-glass-border);
  color: var(--aip-text-secondary);
  cursor: pointer;
  border-radius: var(--aip-radius-sm);
  font-size: 14px;
  transition: all var(--aip-dur-fast) var(--aip-ease-out);
}
.icon-btn:hover {
  background: var(--aip-glass-2);
  color: var(--aip-text-primary);
  border-color: var(--aip-glass-border-hi);
}

.panel-body {
  flex: 1; overflow-y: auto;
  padding: var(--aip-s-4);
  display: flex; flex-direction: column; gap: var(--aip-s-3);
}

.msg { display: flex; gap: var(--aip-s-2); align-items: flex-start; }
.msg.user { flex-direction: row-reverse; }
.avatar {
  width: 28px; height: 28px;
  flex-shrink: 0;
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--aip-glass-2);
  color: var(--aip-text-secondary);
  border-radius: var(--aip-radius-sm);
  font-family: var(--aip-font-mono);
  font-size: 11px;
  border: 1px solid var(--aip-glass-border);
}
.msg.user .avatar {
  background: rgba(91, 108, 255, 0.18);
  color: var(--aip-brand);
  border-color: rgba(91, 108, 255, 0.35);
}
.msg.assistant .avatar {
  background: var(--aip-neon-1);
  color: #FFFFFF;
  border: none;
  font-weight: 600;
}

.bubble {
  background: var(--aip-glass-2);
  border: 1px solid var(--aip-glass-border);
  border-radius: var(--aip-radius-md);
  padding: var(--aip-s-3) var(--aip-s-4);
  max-width: 80%;
  font-size: var(--aip-fs-sm);
  line-height: 1.6;
  word-wrap: break-word;
  backdrop-filter: blur(8px);
}
.msg.user .bubble {
  background: rgba(91, 108, 255, 0.10);
  border-color: rgba(91, 108, 255, 0.25);
}
.content { color: var(--aip-text-primary); white-space: pre-wrap; }

.typing { display: inline-flex; gap: 4px; }
.typing span {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--aip-text-secondary);
  animation: typing 1.4s infinite ease-in-out;
}
.typing span:nth-child(2) { animation-delay: 0.2s; }
.typing span:nth-child(3) { animation-delay: 0.4s; }
@keyframes typing {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
  30% { transform: translateY(-4px); opacity: 1; }
}

.empty { text-align: center; padding: var(--aip-s-6) var(--aip-s-2); }
.empty-title {
  font-family: var(--aip-font-mono);
  font-size: var(--aip-fs-sm);
  color: var(--aip-text-primary);
  margin-bottom: var(--aip-s-2);
  font-weight: 500;
}
.empty-sub {
  font-size: var(--aip-fs-xs);
  color: var(--aip-text-secondary);
  margin-bottom: var(--aip-s-5);
}
.presets { display: flex; flex-direction: column; gap: var(--aip-s-2); }
.preset {
  text-align: left;
  background: var(--aip-glass-1);
  border: 1px solid var(--aip-glass-border);
  border-radius: var(--aip-radius-md);
  color: var(--aip-text-primary);
  padding: var(--aip-s-3) var(--aip-s-4);
  font-size: var(--aip-fs-xs);
  cursor: pointer;
  font-family: var(--aip-font-ui);
  transition: all var(--aip-dur-fast) var(--aip-ease-out);
}
.preset:hover {
  border-color: var(--aip-brand);
  color: var(--aip-brand);
  background: var(--aip-glass-2);
}

.panel-foot {
  display: flex; gap: var(--aip-s-2); align-items: flex-end;
  padding: var(--aip-s-3);
  border-top: 1px solid var(--aip-glass-border);
  background: var(--aip-glass-2);
}
.panel-foot textarea {
  flex: 1;
  background: var(--aip-glass-1);
  border: 1px solid var(--aip-glass-border);
  border-radius: var(--aip-radius-md);
  color: var(--aip-text-primary);
  padding: var(--aip-s-3);
  font-family: var(--aip-font-ui);
  font-size: var(--aip-fs-sm);
  outline: none;
  resize: none;
  max-height: 100px;
  transition: all var(--aip-dur-fast) var(--aip-ease-out);
}
.panel-foot textarea:focus {
  border-color: var(--aip-brand);
  background: var(--aip-glass-2);
  box-shadow: 0 0 0 3px rgba(91, 108, 255, 0.12);
}
.panel-foot textarea::placeholder { color: var(--aip-text-secondary); }

.send {
  width: 40px; height: 40px;
  flex-shrink: 0;
  background: var(--aip-neon-1);
  color: #FFFFFF;
  border: none;
  border-radius: var(--aip-radius-md);
  cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center;
  transition: all var(--aip-dur-fast) var(--aip-ease-out);
}
.send:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(91, 108, 255, 0.35); }
.send:disabled { opacity: 0.4; cursor: not-allowed; }

.fade-up-enter-active, .fade-up-leave-active { transition: all var(--aip-dur-base) var(--aip-ease-out); }
.fade-up-enter-from, .fade-up-leave-to { opacity: 0; transform: translateY(20px); }

.slide-up-enter-active, .slide-up-leave-active { transition: all var(--aip-dur-slow) var(--aip-ease-out); }
.slide-up-enter-from, .slide-up-leave-to { opacity: 0; transform: translateY(40px) scale(0.95); }

.panel-context {
  padding: var(--aip-s-3) var(--aip-s-4);
  font-family: var(--aip-font-mono);
  font-size: var(--aip-fs-xs);
  color: var(--aip-text-secondary);
  background: var(--aip-glass-1);
  border-bottom: 1px solid var(--aip-glass-border);
  display: flex; align-items: center; gap: var(--aip-s-2);
}
.panel-context .ctx-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--aip-brand);
  box-shadow: 0 0 6px var(--aip-brand);
}
.panel-context strong { color: var(--aip-text-primary); font-weight: 600; }
</style>