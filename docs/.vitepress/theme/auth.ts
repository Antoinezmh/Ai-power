import { reactive, computed } from 'vue'

interface User {
  username: string
  displayName: string
  role: 'admin' | 'engineer' | 'guest'
  groups: string[]
}

interface AuthState {
  user: User | null
  token: string | null
  expiresAt: number | null
}

const STORAGE_KEY = 'aipower.auth.v1'

const state = reactive<AuthState>({
  user: null,
  token: null,
  expiresAt: null,
})

function load() {
  if (typeof window === 'undefined') return
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const obj = JSON.parse(raw)
    if (obj.expiresAt && obj.expiresAt > Date.now()) {
      state.user = obj.user
      state.token = obj.token
      state.expiresAt = obj.expiresAt
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  } catch {
    /* ignore */
  }
}

function save() {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function clear() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
}

export const auth = {
  state,

  isAuthenticated: computed(() => !!state.user && !!state.token),

  init() { load() },

  async login(username: string, password: string): Promise<{ ok: boolean; error?: string }> {
    try {
      const base = import.meta.env.BASE_URL || '/'
      const res = await fetch(`${base}api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        return { ok: false, error: j.detail || `HTTP ${res.status}` }
      }
      const data = await res.json()
      state.user = data.user
      state.token = data.token
      state.expiresAt = Date.now() + data.expires_in * 1000
      save()
      return { ok: true }
    } catch (e: any) {
      return { ok: false, error: e?.message || '网络错误' }
    }
  },

  logout() {
    state.user = null
    state.token = null
    state.expiresAt = null
    clear()
  },
}
