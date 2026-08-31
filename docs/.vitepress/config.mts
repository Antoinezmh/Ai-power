import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Ai Power',
  description: 'Power Device Engineering, Engineered.',
  cleanUrls: true,
  lastUpdated: true,
  appearance: 'dark',

  ignoreDeadLinks: true,

  head: [
    ['meta', { name: 'theme-color', content: '#0B0F17' }],
    ['meta', { name: 'robots', content: 'noindex,nofollow' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
    ['link',
      { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&family=JetBrains+Mono:wght@400;500&display=swap' },
    ],
  ],

  vite: {
    server: {
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8765',
          changeOrigin: true,
        },
      },
    },
  },

  themeConfig: {
    logo: { src: '/logo.svg', alt: '' },
    siteTitle: false as any,
    nav: [
      { text: '首页', link: '/' },
      { text: '能力', link: '/capabilities' },
      { text: '关于', link: '/about' },
    ],
    outline: { level: [2, 3], label: '目录' },
    search: { provider: false },
    socialLinks: [],
    footer: {
      message: '© 2026 功率器件研发部 · 内部资料 · 不对外公开',
      copyright: '反馈：aipower@company.local',
    },
  },
})
