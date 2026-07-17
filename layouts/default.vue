<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { useLoginModal } from '~/composables/useLoginModal'
import { useContentful } from '~/composables/useContentful'
import type { FooterContent } from '~/types/index'

const authStore = useAuthStore()
const route = useRoute()
const { isLoginModalOpen, closeLoginModal } = useLoginModal()
const { fetchSingleton } = useContentful()

const { data: footerContent } = await useAsyncData('footerContent', () =>
   fetchSingleton<FooterContent>('footerContent')
)

const navLinks = [
  { name: 'Home', path: '/' },
  { name: 'Pipeline', path: '/pipeline' },
  { name: 'Services & Pricing', path: '/services' },
]

const isActiveLink = (path: string): boolean => {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}

const handleStartProject = () => {
  navigateTo('/intake')
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
        <NuxtLink
          v-for="link in navLinks"
          :key="link.path"
          :to="link.path"
          class="nav-link"
          :class="{ active: isActiveLink(link.path) }"
        >
          {{ link.name }}
        </NuxtLink>
      </div>

      <div class="nav-actions">
        <!-- Auth state -->
        <template v-if="authStore.isSignedIn">
          <SharedUserMenu />
        </template>
        <template v-else>
          <button class="nav-cta" @click="handleStartProject">
            Get in Touch
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
      <strong>{{ footerContent.organizationName }}</strong> · {{ footerContent.organizationAddress }}<br>
      Billing: {{ footerContent.billingEmail }} · Partnerships: {{ footerContent.partnershipEmail }}
      · <NuxtLink to="/admin" class="footer-admin">I3H Staff</NuxtLink>
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
  background: var(--penn-blue);
  border-radius: 4px;
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
  gap: 1.5rem;
  align-items: center;
}

.nav-link {
  padding: 0.5rem 0.25rem;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.2s;
  cursor: pointer;
  color: var(--muted);
  text-decoration: none;
  border-bottom: 2px solid transparent;
  border-radius: 0;

  &:hover {
    color: var(--penn-blue);
    background: transparent;
  }

  &.active {
    color: var(--penn-blue);
    background: transparent;
    border-bottom-color: var(--penn-blue);
  }
}

.nav-actions {
  margin-left: 0.5rem;
}

.nav-cta {
  padding: 0.45rem 1.2rem;
  font-size: 0.82rem;
  font-weight: 600;
  border-radius: 4px;
  background: var(--penn-blue);
  color: #fff;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  font-family: inherit;
  margin-left: 1rem;

  &:hover {
    background: var(--penn-light-blue);
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

// Low-key admin console entry — blends into the footer text
.footer-admin {
  color: rgba(255, 255, 255, 0.35);
  text-decoration: none;
  transition: color 0.2s;

  &:hover {
    color: rgba(255, 255, 255, 0.75);
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
