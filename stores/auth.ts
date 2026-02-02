/**
 * Auth Store - Main authentication state management
 *
 * Manages user profile, workspaces, and authentication state.
 * Based on Pennsieve Discover app patterns.
 */
import { defineStore } from 'pinia'
import type { User, Organization, AuthState } from '~/types'

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    profile: null,
    workspaces: [],
    authToken: null,
    isAuthLoading: false,
    authError: null,
  }),

  getters: {
    isSignedIn: (state): boolean => state.profile !== null,

    userDisplayName: (state): string => {
      if (!state.profile) return ''
      const { firstName, lastName } = state.profile
      const initial = firstName?.charAt(0) || ''
      return `${initial}. ${lastName || ''}`
    },

    userFullName: (state): string => {
      if (!state.profile) return ''
      return `${state.profile.firstName || ''} ${state.profile.lastName || ''}`.trim()
    },

    userEmail: (state): string => {
      return state.profile?.email || ''
    },

    userInitials: (state): string => {
      if (!state.profile) return ''
      const first = state.profile.firstName?.charAt(0) || ''
      const last = state.profile.lastName?.charAt(0) || ''
      return `${first}${last}`.toUpperCase()
    },

    primaryWorkspace: (state): Organization | null => {
      if (state.workspaces.length === 0) return null
      // Return workspace matching preferredOrganizationId, or first workspace
      const preferred = state.profile?.preferredOrganizationId
      return state.workspaces.find(w => w.id === preferred) || state.workspaces[0]
    },
  },

  actions: {
    clearState() {
      this.profile = null
      this.workspaces = []
      this.authToken = null
      this.authError = null
    },

    setAuthLoading(isLoading: boolean) {
      this.isAuthLoading = isLoading
    },

    setAuthError(error: string | null) {
      this.authError = error
    },

    setAuthToken(token: string | null) {
      this.authToken = token
    },

    updateProfile(profile: User) {
      this.profile = profile
    },

    updateWorkspaces(workspaces: Organization[]) {
      this.workspaces = workspaces
    },
  },
})
