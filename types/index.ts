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

// Home Page content model
export interface HomePageContent {
  heroBadge: string
  heroHeadline: string
  heroSubheadline: string
  primaryCtaLabel: string
  secondaryCtaLabel: string
  heroMetrics: Array<{ value: string; label: string }>
  journeyOverline: string
  journeyHeading: string
  journeyDescription: string
  journeySteps: Array<{ number: number; title: string; description: string; color: string }>
  partnershipHeading: string
  partnershipDescription: string
  partnershipEmail: string
  partnershipCtaLabel: string
  teamOverline: string
  teamHeading: string
  teamDescription: string
  contactPills: Array<{ role: string; name: string; email: string }>
}

// Team Member content model
export interface TeamMemberContent {
  name: string
  initials: string
  role: string
  bio: string
  email: string
  color: string
  order: number
}

// Pipeline Step content model
export interface PipelineStepContent {
  id: string
  number: string
  title: string
  description: string
  timeTag: string
  theme: string
  icon: string
  qcMetrics: Array<{ label: string; value: string; context?: string; barPercentage?: number }>
  details: string
  checklistItems: string[]
  tags?: string[]
  order: number
}

// Pipeline Page content model
export interface PipelinePageContent {
  headerOverline: string
  headerHeading: string
  headerDescription: string
  summaryOverline: string
  summaryHeading: string
  summaryMetrics: Array<{ value: string; label: string }>
}

// Services Page content model
export interface ServicesPageContent {
  headerOverline: string
  headerHeading: string
  headerDescription: string
  pricingNote: string
  billingHeading: string
  billingDescription: string
}

// Service Item content model (for CMS-managed services)
export interface ServiceContent {
  name: string
  description: string
  internalRate: number
  externalRate: number
  unit: string
  isActive: boolean
  category: string
  order: number
}

// Intake Sidebar Card content model
export interface IntakeSidebarCardContent {
  title: string
  body: string
  variant?: 'default' | 'partnership'
  order: number
}

// Intake Page content model
export interface IntakePageContent {
  pageTitle: string
  pageDescription: string
  affiliationInfoInternal: string
  affiliationInfoExternal: string
  affiliationInfoIndustry: string
}

// Site Settings content model (singleton)
export interface SiteSettingsContent {
  footerText: string
  footerBillingEmail: string
  footerPartnershipEmail: string
  organizationName: string
  organizationAddress: string
}
