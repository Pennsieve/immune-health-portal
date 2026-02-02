<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { useLoginModal } from '~/composables/useLoginModal'

const authStore = useAuthStore()
const route = useRoute()
const { isLoginModalOpen, openLoginModal, closeLoginModal } = useLoginModal()

const navLinks = [
  { name: 'Home', path: '/' },
  { name: 'Pipeline', path: '/pipeline' },
  { name: 'Services & Pricing', path: '/services' },
  { name: 'My Cohorts', path: '/dashboard' },
]

const isActiveLink = (path: string): boolean => {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}

const handleStartProject = () => {
  if (authStore.isSignedIn) {
    navigateTo('/intake')
  }
  else {
    openLoginModal('Please sign in to start a project', '/intake')
  }
}

const handleDashboardClick = () => {
  if (!authStore.isSignedIn) {
    openLoginModal('Please sign in to view your cohorts', '/dashboard')
    return false
  }
  return true
}
</script>

<template>
  <div class="app-layout">
    <!-- Navigation -->
    <nav class="nav">
      <NuxtLink to="/" class="nav-brand">
        <div class="i3h-mark">
          I3H
        </div>
        Immune Health
      </NuxtLink>

      <div class="nav-links">
        <template v-for="link in navLinks" :key="link.path">
          <NuxtLink
            v-if="link.path !== '/dashboard'"
            :to="link.path"
            class="nav-link"
            :class="{ active: isActiveLink(link.path) }"
          >
            {{ link.name }}
          </NuxtLink>
          <span
            v-else
            class="nav-link"
            :class="{ active: isActiveLink(link.path) }"
            @click="handleDashboardClick() && navigateTo(link.path)"
          >
            {{ link.name }}
          </span>
        </template>
      </div>

      <div class="nav-actions">
        <!-- Auth state -->
        <template v-if="authStore.isSignedIn">
          <SharedUserMenu />
        </template>
        <template v-else>
          <button class="nav-cta" @click="handleStartProject">
            Start a Project
          </button>
        </template>
      </div>
    </nav>

    <!-- Main Content -->
    <main class="main-content">
      <slot />
    </main>

    <!-- Footer -->
    <footer class="footer">
      <strong>I3H</strong> · Penn's Institute for Immunology & Immune Health · 3600 Civic Center Boulevard, Philadelphia, PA 19104<br>
      Billing: khas@pennmedicine.upenn.edu · Partnerships: lguercio@pennmedicine.upenn.edu
    </footer>

    <!-- Login Modal -->
    <SharedLoginDialog
      v-if="isLoginModalOpen"
      @close="closeLoginModal"
    />
  </div>
</template>

<style scoped lang="scss">
.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: var(--nav-h);
  background: rgba(244, 241, 235, 0.92);
  backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  z-index: 1000;
  display: flex;
  align-items: center;
  padding: 0 2rem;
}

.nav-brand {
  font-family: 'DM Serif Display', serif;
  font-size: 1.15rem;
  font-weight: 400;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-right: auto;
  text-decoration: none;
  color: inherit;
}

.i3h-mark {
  width: 28px;
  height: 28px;
  background: var(--accent);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 700;
  font-size: 0.7rem;
  font-family: 'JetBrains Mono', monospace;
}

.nav-links {
  display: flex;
  gap: 0.3rem;
  align-items: center;
}

.nav-link {
  padding: 0.45rem 1rem;
  font-size: 0.82rem;
  font-weight: 500;
  border-radius: 6px;
  transition: all 0.2s;
  cursor: pointer;
  color: var(--muted);
  text-decoration: none;

  &:hover {
    background: rgba(0, 0, 0, 0.04);
    color: var(--ink);
  }

  &.active {
    background: var(--accent);
    color: #fff;
  }
}

.nav-actions {
  margin-left: 0.5rem;
}

.nav-cta {
  padding: 0.45rem 1.2rem;
  font-size: 0.82rem;
  font-weight: 600;
  border-radius: 6px;
  background: var(--teal);
  color: #fff;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  font-family: inherit;

  &:hover {
    background: var(--teal-light);
  }
}

.main-content {
  flex: 1;
  padding-top: var(--nav-h);
}

.footer {
  background: var(--ink);
  color: rgba(255, 255, 255, 0.5);
  padding: 3rem 2rem;
  text-align: center;
  font-size: 0.78rem;
  font-weight: 300;

  strong {
    color: rgba(255, 255, 255, 0.8);
    font-weight: 500;
  }
}

@media (max-width: 700px) {
  .nav {
    padding: 0 1rem;
  }

  .nav-links {
    gap: 0;
  }

  .nav-link {
    padding: 0.4rem 0.6rem;
    font-size: 0.75rem;
  }
}
</style>
