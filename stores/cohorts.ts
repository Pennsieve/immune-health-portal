/**
 * Cohorts Store - Study/cohort management
 *
 * Manages user's cohorts, samples, and study data.
 */
import { defineStore } from 'pinia'
import type { Cohort, Sample, CohortStatus } from '~/types'

interface CohortsState {
  cohorts: Cohort[]
  selectedCohortId: string | null
  samples: Sample[]
  isLoading: boolean
  error: string | null
}

export const useCohortsStore = defineStore('cohorts', {
  state: (): CohortsState => ({
    cohorts: [],
    selectedCohortId: null,
    samples: [],
    isLoading: false,
    error: null,
  }),

  getters: {
    selectedCohort: (state): Cohort | null => {
      if (!state.selectedCohortId) return null
      return state.cohorts.find(c => c.id === state.selectedCohortId) || null
    },

    cohortsByStatus: (state) => (status: CohortStatus): Cohort[] => {
      return state.cohorts.filter(c => c.status === status)
    },

    selectedCohortSamples: (state): Sample[] => {
      if (!state.selectedCohortId) return []
      return state.samples.filter(s => s.cohortId === state.selectedCohortId)
    },

    sampleStats: (state) => {
      if (!state.selectedCohortId) return null
      const cohortSamples = state.samples.filter(s => s.cohortId === state.selectedCohortId)

      return {
        total: cohortSamples.length,
        received: cohortSamples.filter(s => s.processingStatus !== 'received').length,
        processing: cohortSamples.filter(s => s.processingStatus === 'processing').length,
        acquired: cohortSamples.filter(s => s.processingStatus === 'acquired').length,
        qcPassed: cohortSamples.filter(s => s.qcStatus === 'pass').length,
        complete: cohortSamples.filter(s => s.processingStatus === 'complete').length,
      }
    },
  },

  actions: {
    selectCohort(cohortId: string) {
      this.selectedCohortId = cohortId
    },

    clearSelection() {
      this.selectedCohortId = null
    },

    // For demo/mock data
    setCohorts(cohorts: Cohort[]) {
      this.cohorts = cohorts
    },

    setSamples(samples: Sample[]) {
      this.samples = samples
    },

    setLoading(isLoading: boolean) {
      this.isLoading = isLoading
    },

    setError(error: string | null) {
      this.error = error
    },

    // TODO: Implement API calls when backend is ready
    async fetchCohorts() {
      this.setLoading(true)
      this.setError(null)

      try {
        // Placeholder for API call
        // const response = await useSendAuthXhr<Cohort[]>(`${apiHost}/cohorts`, token)
        // this.setCohorts(response)

        // For now, use mock data
        this.setCohorts(getMockCohorts())
        this.setSamples(getMockSamples())
      }
      catch (error) {
        this.setError(error instanceof Error ? error.message : 'Failed to fetch cohorts')
      }
      finally {
        this.setLoading(false)
      }
    },
  },
})

// Mock data for development
function getMockCohorts(): Cohort[] {
  return [
    {
      id: 'cohort-1',
      name: 'BHB ColCan',
      acronym: 'BHB',
      principalInvestigator: 'Dr. Katona',
      piEmail: 'katona@pennmedicine.upenn.edu',
      projectLead: 'John Smith',
      leadEmail: 'jsmith@pennmedicine.upenn.edu',
      objectives: 'Investigation of BHB supplementation in CRC prevention',
      subjectCount: 20,
      timepointCount: 2,
      totalSamples: 40,
      sampleType: 'fresh-blood',
      phlebotomyNeeds: 'ih-campus',
      status: 'processing',
      affiliation: 'internal',
      budgetCode: '400-4661-1-605016-xxxx-2459-0000',
      createdAt: '2024-01-15',
      updatedAt: '2024-02-01',
    },
    {
      id: 'cohort-2',
      name: 'PRINCE-Val Asthma',
      acronym: 'PRINCE',
      principalInvestigator: 'Dr. Vonderheide',
      piEmail: 'vonderheide@pennmedicine.upenn.edu',
      projectLead: 'Sarah Johnson',
      leadEmail: 'sjohnson@pennmedicine.upenn.edu',
      objectives: 'Immune profiling in severe asthma patients',
      subjectCount: 45,
      timepointCount: 3,
      totalSamples: 135,
      sampleType: 'fresh-blood',
      phlebotomyNeeds: 'ih-campus',
      status: 'complete',
      affiliation: 'internal',
      createdAt: '2023-06-01',
      updatedAt: '2024-01-20',
    },
    {
      id: 'cohort-3',
      name: 'SURGE-Christie',
      acronym: 'SURGE',
      principalInvestigator: 'Dr. Christie',
      piEmail: 'christie@pennmedicine.upenn.edu',
      projectLead: 'Michael Lee',
      leadEmail: 'mlee@pennmedicine.upenn.edu',
      objectives: 'Surgical recovery immune response study',
      subjectCount: 30,
      timepointCount: 2,
      totalSamples: 60,
      sampleType: 'fresh-blood',
      phlebotomyNeeds: 'self-collect',
      status: 'intake',
      affiliation: 'internal',
      createdAt: '2024-02-01',
      updatedAt: '2024-02-01',
    },
  ]
}

function getMockSamples(): Sample[] {
  return [
    {
      id: 'sample-1',
      cohortId: 'cohort-1',
      subjectId: '001',
      timepoint: 'Baseline',
      viability: 94.2,
      eventCount: 248301,
      qcStatus: 'pass',
      processingStatus: 'complete',
      createdAt: '2024-01-20',
      updatedAt: '2024-01-25',
    },
    {
      id: 'sample-2',
      cohortId: 'cohort-1',
      subjectId: '001',
      timepoint: 'Week 4',
      viability: 91.8,
      eventCount: 231022,
      qcStatus: 'pass',
      processingStatus: 'complete',
      createdAt: '2024-02-17',
      updatedAt: '2024-02-22',
    },
    {
      id: 'sample-3',
      cohortId: 'cohort-1',
      subjectId: '002',
      timepoint: 'Baseline',
      viability: 96.1,
      eventCount: 267445,
      qcStatus: 'pass',
      processingStatus: 'complete',
      createdAt: '2024-01-21',
      updatedAt: '2024-01-26',
    },
    {
      id: 'sample-4',
      cohortId: 'cohort-1',
      subjectId: '002',
      timepoint: 'Week 4',
      viability: 89.4,
      qcStatus: 'pending',
      processingStatus: 'acquired',
      createdAt: '2024-02-18',
      updatedAt: '2024-02-20',
    },
    {
      id: 'sample-5',
      cohortId: 'cohort-1',
      subjectId: '003',
      timepoint: 'Baseline',
      viability: 93.7,
      qcStatus: 'pending',
      processingStatus: 'processing',
      createdAt: '2024-01-22',
      updatedAt: '2024-01-22',
    },
    {
      id: 'sample-6',
      cohortId: 'cohort-1',
      subjectId: '003',
      timepoint: 'Week 4',
      qcStatus: 'pending',
      processingStatus: 'received',
      createdAt: '2024-02-19',
      updatedAt: '2024-02-19',
    },
  ]
}
