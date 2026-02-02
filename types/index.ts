// User & Auth Types
export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  preferredOrganizationId?: string
  createdAt: string
  updatedAt: string
}

export interface Organization {
  id: string
  name: string
  slug: string
  role?: string
}

export interface AuthState {
  profile: User | null
  workspaces: Organization[]
  authToken: string | null
  isAuthLoading: boolean
  authError: string | null
}

// Cohort & Study Types
export interface Cohort {
  id: string
  name: string
  acronym?: string
  principalInvestigator: string
  piEmail: string
  projectLead: string
  leadEmail: string
  irbNumber?: string
  objectives: string
  subjectCount: number
  timepointCount: number
  totalSamples: number
  sampleType: SampleType
  phlebotomyNeeds: PhlebotomyOption
  status: CohortStatus
  affiliation: AffiliationType
  budgetCode?: string
  createdAt: string
  updatedAt: string
}

export type CohortStatus = 'intake' | 'processing' | 'complete'
export type SampleType = 'fresh-blood' | 'stored-pbmc' | 'tissue' | 'other'
export type PhlebotomyOption = 'ih-campus' | 'remote' | 'self-collect' | 'stored'
export type AffiliationType = 'internal' | 'external' | 'industry'

// Sample Types
export interface Sample {
  id: string
  cohortId: string
  subjectId: string
  timepoint: string
  viability?: number
  eventCount?: number
  qcStatus: QCStatus
  processingStatus: ProcessingStatus
  createdAt: string
  updatedAt: string
}

export type QCStatus = 'pending' | 'pass' | 'fail'
export type ProcessingStatus = 'received' | 'processing' | 'acquired' | 'qc' | 'complete'

// Service Types
export interface Service {
  id: string
  name: string
  description: string
  internalRate: number
  externalRate: number
  unit: string
  isActive: boolean
  category: ServiceCategory
}

export type ServiceCategory = 'collection' | 'processing' | 'cytof' | 'analysis' | 'other'

export interface ServiceRequest {
  serviceId: string
  quantity: number
}

// Intake Form Types
export interface IntakeFormData {
  projectName: string
  acronym?: string
  principalInvestigator: string
  piEmail: string
  projectLead: string
  leadEmail: string
  irbNumber?: string
  objectives: string
  subjectCount: number
  timepointCount: number
  sampleType: SampleType
  phlebotomyNeeds: PhlebotomyOption
  services: ServiceRequest[]
  affiliation: AffiliationType
  budgetCode?: string
  fundingName?: string
  baName?: string
  baEmail?: string
  externalInstitution?: string
  externalContact?: string
  metadataPlan?: string
  notes?: string
}

// Team Member Types
export interface TeamMember {
  id: string
  name: string
  initials: string
  role: string
  email: string
  bio: string
  color: string
}

// Pipeline Step Types
export interface PipelineStep {
  id: string
  number: string
  title: string
  description: string
  timeTag: string
  theme: string
  icon: string
  qcMetrics?: QCMetric[]
  details?: string
  checklistItems?: string[]
  tags?: string[]
}

export interface QCMetric {
  label: string
  value: string
  context?: string
  barPercentage?: number
}

// Contentful Types
export interface ContentfulEntry<T> {
  sys: {
    id: string
    type: string
    createdAt: string
    updatedAt: string
    contentType: {
      sys: {
        id: string
      }
    }
  }
  fields: T
}

export interface HeroContent {
  badge: string
  headline: string
  subheadline: string
  metrics: Array<{
    value: string
    label: string
  }>
}

export interface ServiceContent {
  name: string
  description: string
  internalRate: string
  externalRate: string
  unit: string
  status: string
  category: string
}
