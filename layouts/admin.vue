<script setup lang="ts">
import { useAdminStore } from '~/stores/admin'

const adminStore = useAdminStore()
const route = useRoute()
const supabase = useSupabaseClient()

const userMenuOpen = ref(false)
const sessionExpiresAt = ref<number | null>(null)
let sessionTimer: ReturnType<typeof setInterval> | null = null

const sessionExpiryLabel = computed(() => {
  if (!sessionExpiresAt.value) return 'Active session'
  const msLeft = sessionExpiresAt.value * 1000 - Date.now()
  if (msLeft <= 0) return 'Session expired'
  const minsLeft = Math.floor(msLeft / 60000)
  if (minsLeft < 1) return 'Expires in less than a minute'
  if (minsLeft < 60) return `Expires in ${minsLeft} min`
  const h = Math.floor(minsLeft / 60)
  const m = minsLeft % 60
  return m > 0 ? `Expires in ${h}h ${m}m` : `Expires in ${h}h`
})

function toggleUserMenu(e: Event) {
  e.stopPropagation()
  userMenuOpen.value = !userMenuOpen.value
}

function closeUserMenu() {
  userMenuOpen.value = false
}

async function handleSignOut() {
  closeUserMenu()
  await adminStore.logout()
  navigateTo('/admin/login')
}

function isActive(path: string) {
  return route.path === path || route.path.startsWith(path + '/')
}

onMounted(async () => {
  document.addEventListener('click', closeUserMenu)
  if (!adminStore.isInitialized) {
    await adminStore.loadAll()
  }
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.expires_at) {
    sessionExpiresAt.value = session.expires_at
    sessionTimer = setInterval(() => {
      // Force recompute every minute; also refresh the stored value from the live session
      supabase.auth.getSession().then(({ data: { session: s } }) => {
        if (s?.expires_at) sessionExpiresAt.value = s.expires_at
      })
    }, 60000)
  }
})

onUnmounted(() => {
  document.removeEventListener('click', closeUserMenu)
  if (sessionTimer) clearInterval(sessionTimer)
})
</script>

<template>
  <div class="admin-shell">
    <!-- Top bar -->
    <header class="admin-topbar">
      <NuxtLink to="/admin" class="brand">
        <div class="mark">I3H</div>
        Immune Health
      </NuxtLink>
      <div class="scope-pill">Admin Console</div>
      <div class="topbar-spacer" />
      <div class="user-pill" @click.stop="toggleUserMenu">
        <div class="av">{{ adminStore.user.initials }}</div>
        <div>
          <div class="pill-name">{{ adminStore.user.name }}</div>
          <div class="pill-role">{{ adminStore.user.role }}</div>
        </div>
        <span class="caret">▾</span>
        <div v-if="userMenuOpen" class="user-menu" @click.stop>
          <div class="who">
            <div class="um-name">{{ adminStore.user.name }}</div>
            <div class="um-email">{{ adminStore.user.email }}</div>
            <div class="um-session">
              <span class="dot" />
              {{ sessionExpiryLabel }}
            </div>
          </div>
          <button class="um-item danger" @click="handleSignOut">
            <span class="ico">⎋</span> Sign out
          </button>
        </div>
      </div>
    </header>

    <!-- Shell: sidebar + main -->
    <div class="admin-body">
      <nav class="admin-sidebar">
        <div class="sb-section">Operations</div>
        <NuxtLink to="/admin" class="sb-link" :class="{ active: route.path === '/admin' }">
          <span class="sb-ico">◆</span> Dashboard
        </NuxtLink>
        <NuxtLink to="/admin/inquiries" class="sb-link" :class="{ active: isActive('/admin/inquiries') }">
          <span class="sb-ico">⌧</span> Inquiries
          <span class="sb-count">{{ adminStore.newInquiriesCount }}</span>
        </NuxtLink>
        <NuxtLink to="/admin/studies" class="sb-link" :class="{ active: isActive('/admin/studies') }">
          <span class="sb-ico">≡</span> Studies
          <span class="sb-count">{{ adminStore.studies.length }}</span>
        </NuxtLink>
      </nav>

      <main class="admin-main">
        <slot />
      </main>
    </div>
  </div>
</template>
