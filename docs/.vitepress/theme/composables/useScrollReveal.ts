import { ref, onMounted, onBeforeUnmount, type Ref } from 'vue'

export interface ScrollRevealOptions {
  /** 触发阈值，元素进入视口多少比例时触发。默认 0.15 = 15% */
  threshold?: number
  /** 是否只触发一次（默认 true）。设 false 可双向进出 */
  once?: boolean
  /** 初始是否已可见。设为 true 表示加载时立即可见（适合 hero / 第一屏） */
  initial?: boolean
}

export interface ScrollRevealReturn {
  isInView: Ref<boolean>
  /**
   * 用法：<section :ref="(el) => hero.setRef(el)" :class="{ 'is-in-view': hero.isInView }">
   */
  setRef: (el: unknown) => void
}

/**
 * 监听元素进入视口，切换 is-in-view。
 *
 * 实现策略（多保险，确保任何浏览器都能用）：
 * 1. 同步 getBoundingClientRect 立即检查（避免 IO 异步造成首屏空白）
 * 2. IntersectionObserver（标准做法）
 * 3. scroll + resize 事件兜底（IO 失败时仍可触发）
 * 4. 1.5 秒超时强制可见（最后保险，绝不白屏）
 */
export function useScrollReveal(options: ScrollRevealOptions = {}): ScrollRevealReturn {
  const {
    threshold = 0.15,
    once = true,
    initial = false,
  } = options

  const isInView = ref(initial)
  let el: HTMLElement | null = null
  let io: IntersectionObserver | null = null

  const check = () => {
    if (!el) return
    if (isInView.value && once) return
    const rect = el.getBoundingClientRect()
    const wh = window.innerHeight || document.documentElement.clientHeight
    // 元素顶部进入视口 (1 - threshold) 处即触发
    const triggerLine = wh * (1 - threshold)
    if (rect.top < triggerLine && rect.bottom > 0) {
      isInView.value = true
      if (once) {
        window.removeEventListener('scroll', onScrollEvt, { capture: false } as any)
        window.removeEventListener('resize', onScrollEvt)
        io?.disconnect()
      }
    } else if (!once) {
      isInView.value = false
    }
  }

  const onScrollEvt = () => check()

  const setupObserver = () => {
    if (!el) return
    // 同步初始检测
    check()
    if (isInView.value && once) return

    // IntersectionObserver
    if (typeof window !== 'undefined' && 'IntersectionObserver' in window) {
      io = new IntersectionObserver(
        () => check(),
        { threshold: [0, 0.1, 0.2, 0.5] }
      )
      io.observe(el)
    }
    // scroll + resize 兜底（用 capture: false 避免重复）
    window.addEventListener('scroll', onScrollEvt, { passive: true })
    window.addEventListener('resize', onScrollEvt)
  }

  const setRef = (e: unknown) => {
    if (e && e instanceof Element) {
      if (e === el) return
      el = e as HTMLElement
      setupObserver()
    } else if (!e && el) {
      io?.disconnect()
      window.removeEventListener('scroll', onScrollEvt)
      window.removeEventListener('resize', onScrollEvt)
      el = null
    }
  }

  onMounted(() => {
    // 1.5 秒兜底：任何情况下都不会白屏
    const t = window.setTimeout(() => {
      if (!isInView.value) {
        isInView.value = true
        io?.disconnect()
        window.removeEventListener('scroll', onScrollEvt)
        window.removeEventListener('resize', onScrollEvt)
      }
    }, 1500)
    onBeforeUnmount(() => window.clearTimeout(t))
  })

  onBeforeUnmount(() => {
    io?.disconnect()
    io = null
    window.removeEventListener('scroll', onScrollEvt)
    window.removeEventListener('resize', onScrollEvt)
    el = null
  })

  return { isInView, setRef }
}