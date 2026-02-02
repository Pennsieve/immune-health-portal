<script setup lang="ts">
/**
 * User Menu Component
 *
 * Dropdown menu for authenticated users showing profile info and logout.
 */
import { useAuthStore } from '~/stores/auth'
import { useSignOut } from '~/composables/useGetToken'

const authStore = useAuthStore()
const isOpen = ref(false)

const toggleMenu = () => {
  isOpen.value = !isOpen.value
}

const closeMenu = () => {
  isOpen.value = false
}

const handleLogout = async () => {
  await useSignOut()
  authStore.clearState()
  closeMenu()
  navigateTo('/')
}

// Close menu when clicking outside
onMounted(() => {
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement
    if (!target.closest('.user-menu')) {
      closeMenu()
    }
  })
})
</script>

<template>
  <div class="user-menu">
    <button class="user-trigger" @click="toggleMenu">
      <span class="user-avatar">{{ authStore.userInitials }}</span>
      <span class="user-name">{{ authStore.userDisplayName }}</span>
      <svg class="chevron" :class="{ open: isOpen }" viewBox="0 0 12 12">
        <polyline points="2,4 6,8 10,4" />
      </svg>
    </button>

    <Transition name="dropdown">
      <div v-if="isOpen" class="dropdown-menu">
        <div class="dropdown-header">
          <strong>{{ authStore.userFullName }}</strong>
          <span>{{ authStore.userEmail }}</span>
        </div>

        <div class="dropdown-divider" />

        <NuxtLink to="/dashboard" class="dropdown-item" @click="closeMenu">
          My Cohorts
        </NuxtLink>

        <NuxtLink to="/intake" class="dropdown-item" @click="closeMenu">
          Start New Project
        </NuxtLink>

        <div class="dropdown-divider" />

        <button class="dropdown-item logout" @click="handleLogout">
          Sign Out
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped lang="scss">
.user-menu {
  position: relative;
}

.user-trigger {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.3rem 0.8rem 0.3rem 0.3rem;
  background: transparent;
  border: 1.5px solid var(--line);
  border-radius: 100px;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.2s;

  &:hover {
    border-color: var(--accent);
  }
}

.user-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 600;
  font-family: 'JetBrains Mono', monospace;
}

.user-name {
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--ink);
}

.chevron {
  width: 10px;
  height: 10px;
  stroke: var(--muted);
  stroke-width: 2;
  fill: none;
  transition: transform 0.2s;

  &.open {
    transform: rotate(180deg);
  }
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: var(--card);
  border-radius: var(--radius);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  min-width: 220px;
  overflow: hidden;
  z-index: 100;
}

.dropdown-header {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;

  strong {
    font-size: 0.9rem;
    font-weight: 600;
  }

  span {
    font-size: 0.78rem;
    color: var(--muted);
    font-weight: 300;
  }
}

.dropdown-divider {
  height: 1px;
  background: var(--line);
  margin: 0;
}

.dropdown-item {
  display: block;
  padding: 0.75rem 1rem;
  font-size: 0.85rem;
  color: var(--ink);
  text-decoration: none;
  transition: background 0.2s;
  cursor: pointer;
  background: none;
  border: none;
  width: 100%;
  text-align: left;
  font-family: inherit;

  &:hover {
    background: rgba(0, 0, 0, 0.03);
  }

  &.logout {
    color: var(--warm);
  }
}

.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
