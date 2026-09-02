import { h } from 'vue'
import DefaultTheme from 'vitepress/theme'
import { useRouter } from 'vitepress'
import Layout from './Layout.vue'
import './custom.css'

import HeroBanner from './components/HeroBanner.vue'
import LoginPage from './components/LoginPage.vue'
import Workspace from './components/Workspace.vue'
import AgentDock from './components/AgentDock.vue'
import CapabilitiesPage from './components/CapabilitiesPage.vue'
import AboutPage from './components/AboutPage.vue'
import GroupCard from './components/GroupCard.vue'
import ToolCard from './components/ToolCard.vue'
import StatusBadge from './components/StatusBadge.vue'
import KindBadge from './components/KindBadge.vue'
import TagPill from './components/TagPill.vue'
import GroupTabs from './components/GroupTabs.vue'
import PipelineFlow from './components/PipelineFlow.vue'
import ToolList from './components/ToolList.vue'
import GateCard from './components/GateCard.vue'
import FilterBar from './components/FilterBar.vue'
import ToolsBrowser from './components/ToolsBrowser.vue'
import HomePage from './components/HomePage.vue'
import Tabs from './components/Tabs.vue'

export default {
  extends: DefaultTheme,
  Layout: () => h(Layout, null, () => DefaultTheme.Layout()),
  enhanceApp({ app }) {
    app.component('HeroBanner', HeroBanner)
    app.component('AgentDock', AgentDock)
    app.component('Workspace', Workspace)
    app.component('LoginPage', LoginPage)
    app.component('CapabilitiesPage', CapabilitiesPage)
    app.component('AboutPage', AboutPage)
    app.component('GroupCard', GroupCard)
    app.component('ToolCard', ToolCard)
    app.component('StatusBadge', StatusBadge)
    app.component('KindBadge', KindBadge)
    app.component('TagPill', TagPill)
    app.component('GroupTabs', GroupTabs)
    app.component('PipelineFlow', PipelineFlow)
    app.component('ToolList', ToolList)
    app.component('GateCard', GateCard)
    app.component('FilterBar', FilterBar)
    app.component('ToolsBrowser', ToolsBrowser)
    app.component('HomePage', HomePage)
    app.component('Tabs', Tabs)
  },
  setup() {
    // Force scroll-to-top on every route change so SPA navigation
    // doesn't restore the previous page's scroll position.
    const router = useRouter()
    if (Array.isArray((router as any).onAfterRouteChanged)) {
      ;(router as any).onAfterRouteChanged.push(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
      })
    } else if (typeof (router as any).onAfterRouteChanged === 'function') {
      const prev = (router as any).onAfterRouteChanged
      ;(router as any).onAfterRouteChanged = (...args: any[]) => {
        prev(...args)
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
      }
    } else {
      ;(router as any).onAfterRouteChanged = () => {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
      }
    }
  },
}
