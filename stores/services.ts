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
    services: getDefaultServices(),
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

    // TODO: Implement Contentful fetch when CMS is configured
    async fetchServices() {
      this.setLoading(true)
      this.setError(null)

      try {
        // Placeholder for Contentful fetch
        // const { $contentful } = useNuxtApp()
        // const response = await $contentful.getEntries({ content_type: 'service' })
        // this.setServices(mapContentfulServices(response.items))

        // For now, use default services
        this.setServices(getDefaultServices())
      }
      catch (error) {
        this.setError(error instanceof Error ? error.message : 'Failed to fetch services')
      }
      finally {
        this.setLoading(false)
      }
    },
  },
})

// Default services based on the HTML mockup
function getDefaultServices(): Service[] {
  return [
    {
      id: 'consultation',
      name: 'Project Consultation',
      description: 'Initial consultation to discuss project scope, objectives, and feasibility with the Immune Health team',
      internalRate: 250,
      externalRate: 250,
      unit: 'per consultation',
      isActive: true,
      category: 'other',
    },
    {
      id: 'blood-draw',
      name: 'Blood Draw',
      description: 'Phlebotomy by clinical research team - on campus, in BRB, or remote',
      internalRate: 80,
      externalRate: 120,
      unit: 'per draw',
      isActive: true,
      category: 'collection',
    },
    {
      id: 'transport',
      name: 'Biospecimen Transport',
      description: 'Sample pickup and transport from HUP clinical lab to Immune Health receiving',
      internalRate: 30,
      externalRate: 45,
      unit: 'per trip',
      isActive: true,
      category: 'collection',
    },
    {
      id: 'blood-processing',
      name: 'Blood Processing',
      description: 'Processing whole blood into serum, plasma, DNA, RNA, and/or viably cryopreserved PBMCs. Price scales by volume.',
      internalRate: 300,
      externalRate: 450,
      unit: 'per sample',
      isActive: true,
      category: 'processing',
    },
    {
      id: 'tissue-processing',
      name: 'Tissue Processing',
      description: 'Processing tissue biopsies into single-cell suspensions with viable cryopreservation',
      internalRate: 500,
      externalRate: 750,
      unit: 'per sample',
      isActive: true,
      category: 'processing',
    },
    {
      id: 'cytof-mdipa',
      name: 'CyTOF Immune Profiling (MDIPA)',
      description: 'Staining and acquisition with the 30+ marker MaxPar Direct Immune Profiling Assay on CyTOF',
      internalRate: 325,
      externalRate: 450,
      unit: 'per sample',
      isActive: true,
      category: 'cytof',
    },
    {
      id: 'cytof-neutrophil',
      name: 'CyTOF Neutrophil Expansion Panel',
      description: '9 additional markers for neutrophil/myeloid characterization. Paired with MDIPA assay.',
      internalRate: 250,
      externalRate: 350,
      unit: 'per sample',
      isActive: true,
      category: 'cytof',
    },
    {
      id: 'tier1-analysis',
      name: 'Tier 1 CyTOF Analysis',
      description: 'Standardized gating for 42 populations, PDF comparison report, and UMAP integration in Pennsieve',
      internalRate: 50,
      externalRate: 0, // Contact for pricing
      unit: 'per sample',
      isActive: true,
      category: 'analysis',
    },
    {
      id: 'tier2-analysis',
      name: 'Tier 2 CyTOF Analysis',
      description: 'High-dimensional analysis and statistical testing performed by Immune Health staff. Must be paired with CyTOF (MDIPA).',
      internalRate: 150,
      externalRate: 0, // Contact for pricing
      unit: 'per sample',
      isActive: true,
      category: 'analysis',
    },
    {
      id: 'late-processing',
      name: 'Late Sample Processing',
      description: 'Surcharge for samples delivered after 3 PM requiring same-day processing. 48-hour advance notice required.',
      internalRate: 50,
      externalRate: 75,
      unit: 'per session',
      isActive: true,
      category: 'other',
    },
    {
      id: 'specialized-protocol',
      name: 'Specialized Protocol',
      description: 'Surcharge for non-standard processing requiring specialized equipment, reagents, or staff',
      internalRate: 75,
      externalRate: 100,
      unit: 'per sample',
      isActive: true,
      category: 'other',
    },
  ]
}
