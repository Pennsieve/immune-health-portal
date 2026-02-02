/**
 * Cohorts Store - Study/cohort management
 *
 * Manages user's cohorts, samples, and study data.
 */
import { defineStore } from 'pinia'
import type { Cohort, Sample, CohortStatus, AffiliationType } from '~/types'

type AffiliationFilter = 'academic' | 'external'

interface CohortsState {
  cohorts: Cohort[]
  selectedCohortId: string | null
  samples: Sample[]
  affiliationFilter: AffiliationFilter
  isLoading: boolean
  error: string | null
}

export const useCohortsStore = defineStore('cohorts', {
  state: (): CohortsState => ({
    cohorts: [],
    selectedCohortId: null,
    samples: [],
    affiliationFilter: 'academic',
    isLoading: false,
    error: null,
  }),

  getters: {
    selectedCohort: (state): Cohort | null => {
      if (!state.selectedCohortId) return null
      return state.cohorts.find(c => c.id === state.selectedCohortId) || null
    },

    // Filter cohorts by affiliation (academic = internal, external = external + industry)
    filteredCohorts: (state): Cohort[] => {
      if (state.affiliationFilter === 'academic') {
        return state.cohorts.filter(c => c.affiliation === 'internal')
      }
      return state.cohorts.filter(c => c.affiliation === 'external' || c.affiliation === 'industry')
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

    setAffiliationFilter(filter: AffiliationFilter) {
      this.affiliationFilter = filter
      // Clear selection when switching filters to avoid showing wrong cohort
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
    // Internal/Academic cohorts
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
    // External cohorts
    {
      id: 'cohort-ext-1',
      name: 'TITAN-Harvard',
      acronym: 'TITAN',
      principalInvestigator: 'Dr. Chen',
      piEmail: 'chen@harvard.edu',
      projectLead: 'Emily Rodriguez',
      leadEmail: 'erodriguez@harvard.edu',
      objectives: 'Tumor-infiltrating lymphocyte analysis in melanoma',
      subjectCount: 50,
      timepointCount: 4,
      totalSamples: 200,
      sampleType: 'fresh-blood',
      phlebotomyNeeds: 'remote',
      status: 'processing',
      affiliation: 'external',
      createdAt: '2024-01-10',
      updatedAt: '2024-02-05',
    },
    {
      id: 'cohort-ext-2',
      name: 'IMMUNE-Stanford',
      acronym: 'IMST',
      principalInvestigator: 'Dr. Patel',
      piEmail: 'patel@stanford.edu',
      projectLead: 'David Kim',
      leadEmail: 'dkim@stanford.edu',
      objectives: 'Immunotherapy response profiling in NSCLC',
      subjectCount: 35,
      timepointCount: 3,
      totalSamples: 105,
      sampleType: 'stored-pbmc',
      phlebotomyNeeds: 'stored',
      status: 'complete',
      affiliation: 'external',
      createdAt: '2023-08-15',
      updatedAt: '2024-01-30',
    },
    // Industry cohorts
    {
      id: 'cohort-ind-1',
      name: 'NOVA-BioGen',
      acronym: 'NOVA',
      principalInvestigator: 'Dr. Martinez',
      piEmail: 'martinez@biogen.com',
      projectLead: 'Rachel Thompson',
      leadEmail: 'rthompson@biogen.com',
      objectives: 'CAR-T cell therapy immune monitoring',
      subjectCount: 25,
      timepointCount: 6,
      totalSamples: 150,
      sampleType: 'fresh-blood',
      phlebotomyNeeds: 'remote',
      status: 'processing',
      affiliation: 'industry',
      createdAt: '2024-01-20',
      updatedAt: '2024-02-03',
    },
    {
      id: 'cohort-ind-2',
      name: 'APEX-Merck',
      acronym: 'APEX',
      principalInvestigator: 'Dr. Wilson',
      piEmail: 'wilson@merck.com',
      projectLead: 'James Park',
      leadEmail: 'jpark@merck.com',
      objectives: 'PD-1 checkpoint inhibitor biomarker discovery',
      subjectCount: 60,
      timepointCount: 2,
      totalSamples: 120,
      sampleType: 'fresh-blood',
      phlebotomyNeeds: 'remote',
      status: 'intake',
      affiliation: 'industry',
      createdAt: '2024-02-01',
      updatedAt: '2024-02-01',
    },
  ]
}

function getMockSamples(): Sample[] {
  return [
    // Internal cohort samples (BHB ColCan)
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
    // External cohort samples (TITAN-Harvard)
    {
      id: 'ext-sample-1',
      cohortId: 'cohort-ext-1',
      subjectId: '001',
      timepoint: 'Baseline',
      viability: 92.8,
      eventCount: 215430,
      qcStatus: 'pass',
      processingStatus: 'complete',
      createdAt: '2024-01-15',
      updatedAt: '2024-01-20',
    },
    {
      id: 'ext-sample-2',
      cohortId: 'cohort-ext-1',
      subjectId: '001',
      timepoint: 'Week 4',
      viability: 90.5,
      eventCount: 198200,
      qcStatus: 'pass',
      processingStatus: 'complete',
      createdAt: '2024-02-12',
      updatedAt: '2024-02-17',
    },
    {
      id: 'ext-sample-3',
      cohortId: 'cohort-ext-1',
      subjectId: '002',
      timepoint: 'Baseline',
      viability: 95.2,
      eventCount: 267890,
      qcStatus: 'pass',
      processingStatus: 'complete',
      createdAt: '2024-01-16',
      updatedAt: '2024-01-21',
    },
    {
      id: 'ext-sample-4',
      cohortId: 'cohort-ext-1',
      subjectId: '002',
      timepoint: 'Week 4',
      viability: 88.9,
      qcStatus: 'pending',
      processingStatus: 'acquired',
      createdAt: '2024-02-13',
      updatedAt: '2024-02-15',
    },
    {
      id: 'ext-sample-5',
      cohortId: 'cohort-ext-1',
      subjectId: '003',
      timepoint: 'Baseline',
      viability: 91.4,
      qcStatus: 'pending',
      processingStatus: 'processing',
      createdAt: '2024-01-17',
      updatedAt: '2024-01-17',
    },
    // Industry cohort samples (NOVA-BioGen)
    {
      id: 'ind-sample-1',
      cohortId: 'cohort-ind-1',
      subjectId: '001',
      timepoint: 'Pre-infusion',
      viability: 97.3,
      eventCount: 312500,
      qcStatus: 'pass',
      processingStatus: 'complete',
      createdAt: '2024-01-25',
      updatedAt: '2024-01-30',
    },
    {
      id: 'ind-sample-2',
      cohortId: 'cohort-ind-1',
      subjectId: '001',
      timepoint: 'Day 7',
      viability: 94.1,
      eventCount: 289100,
      qcStatus: 'pass',
      processingStatus: 'complete',
      createdAt: '2024-02-01',
      updatedAt: '2024-02-06',
    },
    {
      id: 'ind-sample-3',
      cohortId: 'cohort-ind-1',
      subjectId: '001',
      timepoint: 'Day 14',
      viability: 91.8,
      qcStatus: 'pending',
      processingStatus: 'acquired',
      createdAt: '2024-02-08',
      updatedAt: '2024-02-10',
    },
    {
      id: 'ind-sample-4',
      cohortId: 'cohort-ind-1',
      subjectId: '002',
      timepoint: 'Pre-infusion',
      viability: 96.5,
      eventCount: 298700,
      qcStatus: 'pass',
      processingStatus: 'complete',
      createdAt: '2024-01-26',
      updatedAt: '2024-01-31',
    },
    {
      id: 'ind-sample-5',
      cohortId: 'cohort-ind-1',
      subjectId: '002',
      timepoint: 'Day 7',
      viability: 93.2,
      qcStatus: 'pending',
      processingStatus: 'processing',
      createdAt: '2024-02-02',
      updatedAt: '2024-02-02',
    },
  ]
}
