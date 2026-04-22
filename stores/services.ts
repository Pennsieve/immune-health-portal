/**
 * Services Store - Service catalog and pricing
 *
 * Manages available services, pricing tiers, and cost calculations.
 */
import { defineStore } from 'pinia'
import type { Service, ServiceRequest, ServiceCategory } from '~/types'

interface ServicesState {
  services: Service[]
  rateView: 'internal' | 'external'
  isLoading: boolean
  error: string | null
}

export const useServicesStore = defineStore('services', {
  state: (): ServicesState => ({
    services: [],
    rateView: 'internal',
    isLoading: false,
    error: null,
  }),

  getters: {
    activeServices: (state): Service[] => {
      return state.services.filter(s => s.isActive)
    },

    servicesByCategory: (state) => (category: ServiceCategory): Service[] => {
      return state.services.filter(s => s.category === category && s.isActive)
    },

    getServiceRate: (state) => (serviceId: string): number => {
      const service = state.services.find(s => s.id === serviceId)
      if (!service) return 0
      return state.rateView === 'internal' ? service.internalRate : service.externalRate
    },

    calculateTotal: (state) => (requests: ServiceRequest[]): number => {
      return requests.reduce((total, req) => {
        const service = state.services.find(s => s.id === req.serviceId)
        if (!service) return total
        const rate = state.rateView === 'internal' ? service.internalRate : service.externalRate
        return total + (rate * req.quantity)
      }, 0)
    },
  },

  actions: {
    setRateView(view: 'internal' | 'external') {
      this.rateView = view
    },

    setServices(services: Service[]) {
      this.services = services
    },

    setLoading(isLoading: boolean) {
      this.isLoading = isLoading
    },

    setError(error: string | null) {
      this.error = error
    },

    async fetchServices() {
      this.setLoading(true)
      this.setError(null)

      try {
        const { $contentful } = useNuxtApp() as { $contentful: any }

        if (!$contentful) throw new Error('Contentful not available')

        const response = await $contentful.getEntries({
          content_type: 'serviceItem',
          order: 'fields.order',
        })

        const mapped: Service[] = response.items.map((item: any) => ({
          id: item.sys.id,
          name: item.fields.name,
          description: item.fields.description,
          internalRate: item.fields.internalRate,
          externalRate: item.fields.externalRate,
          unit: item.fields.unit,
          isActive: item.fields.isActive ?? true,
          category: item.fields.category,
        }))
        this.setServices(mapped)
        return mapped
      }
      catch (error) {
        console.error('[Contentful] Failed to fetch services:', error)
        this.setError('Failed to load services')
      }
      finally {
        this.setLoading(false)
      }
    },
  },
})
