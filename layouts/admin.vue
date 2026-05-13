<script setup lang="ts">
import { useAdminStore } from '~/stores/admin'

const adminStore = useAdminStore()
const route = useRoute()

const userMenuOpen = ref(false)

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
})

onUnmounted(() => {
  document.removeEventListener('click', closeUserMenu)
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
      <div class="topbar-search">
        <input type="search" placeholder="Search studies, PIs, IRBs, sample IDs…">
      </div>
      <NuxtLink to="/admin/communications" class="btn btn-ghost btn-sm">✉ Comms</NuxtLink>
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
              Active session · expires in 47 min
            </div>
          </div>
          <button class="um-item" @click="closeUserMenu(); $emit('alert', 'Phase 2: account settings')">
            <span class="ico">⚙</span> Account settings
          </button>
          <button class="um-item" @click="closeUserMenu(); $emit('alert', 'Phase 2: team management')">
            <span class="ico">◐</span> Manage team access
          </button>
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

        <div class="sb-section">Records</div>
        <button class="sb-link" @click="alert('Phase 2: Investigators directory')">
          <span class="sb-ico">◐</span> Investigators
        </button>
        <button class="sb-link" @click="alert('Phase 2: Rate card management')">
          <span class="sb-ico">$</span> Rate Card
        </button>

        <div class="sb-section">System</div>
        <NuxtLink to="/admin/communications" class="sb-link" :class="{ active: isActive('/admin/communications') }">
          <span class="sb-ico">✉</span> Communications
        </NuxtLink>
        <button class="sb-link" @click="alert('Phase 2: Settings & team access')">
          <span class="sb-ico">⚙</span> Settings
        </button>

        <div class="sb-footer">
          <div style="font-weight:600; color:#7f8c8d; margin-bottom:0.2rem;">Phase 1 MVP</div>
          v0.4.0 · staging · last sync 4 min ago
        </div>
      </nav>

      <main class="admin-main">
        <slot />
      </main>
    </div>
  </div>
</template>
