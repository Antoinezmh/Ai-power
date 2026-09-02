<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import { auth } from './auth'

const { Layout } = DefaultTheme
const router = useRouter()

const showSearch = ref(false)
const isMac = ref(false)

const onKey = (e: KeyboardEvent) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    showSearch.value = true
  }
  if (e.key === 'Escape' && showSearch.value) showSearch.value = false
}

onMounted(() => {
  isMac.value = /Mac|iPod|iPhone|iPad/.test(navigator.platform)
  window.addEventListener('keydown', onKey)
  // Force scroll to top on initial load — some browsers restore scroll position
  // across reloads, which can leave users looking at the bottom of the page.
  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual'
  }
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
})

onUnmounted(() => window.removeEventListener('keydown', onKey))

const goLogout = () => { auth.logout(); router.go('/') }

/**
 * 已登录状态下的“进入应用”跳转地址。
 * - 如果设置了 VITE_APP_URL（内网部署后），点击跳到服务器应用
 * - 否则跳到 vitepress 内部的工作台 /app/
 */
const appUrl = (import.meta.env.VITE_APP_URL as string | undefined)?.trim() || '/app/'
</script>

<template>
  <Layout>
    <template #nav-bar-content-after>
      <div class="aip-nav-extra">
        <button class="aip-search-trigger" @click="showSearch = true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/>
            <path d="M20 20l-3.5-3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <span>搜索</span>
          <span class="aip-kbd-group"><kbd>{{ isMac ? '⌘' : 'Ctrl' }}</kbd><kbd>K</kbd></span>
        </button>
        <template v-if="auth.isAuthenticated.value">
          <a class="aip-user" :href="appUrl">
            <span class="dot" />
            {{ auth.state.user?.displayName }}
          </a>
          <button class="aip-btn-logout" @click="goLogout">退出</button>
        </template>
        <template v-else>
          <a class="aip-login" href="/login">登录</a>
        </template>
      </div>
    </template>
  </Layout>

  <Transition name="aip-fade">
    <div v-if="showSearch" class="aip-search-overlay" @click.self="showSearch = false">
      <div class="aip-search-modal">
        <div class="aip-search-input-wrap">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" class="aip-search-icon">
            <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/>
            <path d="M20 20l-3.5-3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <input class="aip-search-input" placeholder="搜索工具、文档、责任人..." autofocus />
          <kbd class="aip-search-esc">esc</kbd>
        </div>
        <div class="aip-search-hint">
          提示：登录后体验更完整。 <a href="/login">登录 →</a>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.aip-nav-extra { display: flex; align-items: center; gap: var(--aip-s-3); }

/* Search trigger — glassy pill */
.aip-search-trigger {
  display: inline-flex; align-items: center; gap: var(--aip-s-2);
  background: var(--aip-glass-1);
  border: 1px solid var(--aip-glass-border);
  color: var(--aip-text-secondary);
  padding: 6px 10px 6px 12px;
  border-radius: var(--aip-radius-full);
  font-size: var(--aip-fs-sm);
  font-family: var(--aip-font-mono);
  cursor: pointer;
  transition: all var(--aip-dur-fast) var(--aip-ease-out);
}
.aip-search-trigger:hover {
  border-color: var(--aip-glass-border-hi);
  color: var(--aip-text-primary);
  background: var(--aip-glass-2);
}
.aip-kbd-group { display: inline-flex; gap: 2px; margin-left: var(--aip-s-2); }
.aip-kbd-group kbd {
  font-family: var(--aip-font-mono);
  font-size: var(--aip-fs-xs);
  background: var(--aip-glass-3);
  border: 1px solid var(--aip-glass-border);
  border-radius: var(--aip-radius-xs);
  padding: 1px 5px;
  color: var(--aip-text-secondary);
  line-height: 1;
}

/* Logged-in: pill user chip + ghost logout */
.aip-user {
  font-family: var(--aip-font-mono);
  font-size: var(--aip-fs-xs);
  color: var(--aip-text-primary);
  display: inline-flex; align-items: center; gap: var(--aip-s-2);
  padding: 6px 12px;
  background: var(--aip-glass-1);
  border: 1px solid var(--aip-glass-border);
  border-radius: var(--aip-radius-full);
  text-decoration: none;
  transition: all var(--aip-dur-fast) var(--aip-ease-out);
}
.aip-user:hover { border-color: var(--aip-glass-border-hi); background: var(--aip-glass-2); }
.aip-user .dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--aip-ok);
}

.aip-btn-logout {
  color: var(--aip-text-secondary);
  font-family: var(--aip-font-mono);
  font-size: var(--aip-fs-sm);
  padding: 6px 14px;
  background: var(--aip-glass-1);
  border: 1px solid var(--aip-glass-border);
  border-radius: var(--aip-radius-full);
  text-decoration: none;
  cursor: pointer;
  transition: all var(--aip-dur-fast) var(--aip-ease-out);
}
.aip-btn-logout:hover {
  color: var(--aip-text-primary);
  border-color: var(--aip-glass-border-hi);
  background: var(--aip-glass-2);
}

/* Logged-out: neon gradient CTA */
.aip-login {
  display: inline-flex; align-items: center;
  background: var(--aip-neon-2);
  color: #FFFFFF;
  font-family: var(--aip-font-mono);
  font-size: var(--aip-fs-sm);
  font-weight: 600;
  padding: 7px 16px;
  border-radius: var(--aip-radius-full);
  text-decoration: none;
  transition: all var(--aip-dur-fast) var(--aip-ease-out);
}
.aip-login:hover {
  transform: translateY(-1px);
}

/* Search overlay */
.aip-search-overlay {
  position: fixed; inset: 0;
  background: rgba(29, 29, 31, 0.40);
  z-index: 9999;
  display: flex; align-items: flex-start; justify-content: center;
  padding-top: 14vh;
}
.aip-search-modal {
  width: min(640px, 90vw);
  background: var(--aip-glass-3);
  border: 1px solid var(--aip-glass-border-hi);
  border-radius: var(--aip-radius-lg);
  overflow: hidden;
}
.aip-search-input-wrap {
  display: flex; align-items: center; gap: var(--aip-s-3);
  padding: var(--aip-s-4);
  border-bottom: 1px solid var(--aip-glass-border);
}
.aip-search-icon { color: var(--aip-text-secondary); flex-shrink: 0; }
.aip-search-input {
  flex: 1; background: transparent; border: none; outline: none;
  color: var(--aip-text-primary);
  font-size: var(--aip-fs-md);
  font-family: var(--aip-font-ui);
}
.aip-search-input::placeholder { color: var(--aip-text-secondary); }
.aip-search-esc {
  font-family: var(--aip-font-mono);
  font-size: var(--aip-fs-xs);
  background: var(--aip-glass-2);
  border: 1px solid var(--aip-glass-border);
  border-radius: var(--aip-radius-xs);
  padding: 2px 6px;
  color: var(--aip-text-secondary);
}
.aip-search-hint {
  padding: var(--aip-s-4);
  color: var(--aip-text-secondary);
  font-size: var(--aip-fs-sm);
}
.aip-search-hint a { color: var(--aip-brand); text-decoration: none; }
.aip-search-hint a:hover { text-decoration: underline; }
.aip-fade-enter-active, .aip-fade-leave-active { transition: opacity var(--aip-dur-fast) var(--aip-ease-out); }
.aip-fade-enter-from, .aip-fade-leave-to { opacity: 0; }
</style>