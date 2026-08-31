<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vitepress'
import { auth } from './auth'

const route = useRoute()
const router = useRouter()

const PUBLIC_PATHS = ['/', '/about', '/capabilities', '/contact', '/team', '/login', '/blog']

const check = () => {
  const path = route.path
  const isPublic = PUBLIC_PATHS.some(p => path === p || path.startsWith(p + '/'))
  if (!isPublic && !auth.isAuthenticated.value) {
    router.go('/login?redirect=' + encodeURIComponent(path))
  }
}

onMounted(() => {
  auth.init()
  check()
})

watch(() => route.path, check)
</script>

<template>
  <slot />
</template>
