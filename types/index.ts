import type { Entry } from 'contentful'

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

// A study-defined visit/timepoint column in the cohort sample matrix. Admins
// define these per study (see "Defining Visits" in the admin edit modals) —
// there's no longer a fixed set of timepoints shared across every study.
export interface CollectionVisit {
  id: string
  label: string
  description?: string
}

// One cohort/group row in the sample matrix. `samples` holds the tubes/parent
// samples collected per subject at each visit (0 = not collected), keyed by
// the visit's `id`.
export interface CollectionGroup {
  name: string
  description?: string
  subjects: number
  samples: Record<string, number>
}

// Simple public lead form — first contact, before I3H has met the lead. The
// detailed study questionnaire is captured internally by the I3H team after
// that conversation (see utils/intakeFields.ts), not via a PI-facing form.
export interface LeadFormData {
  name: string
  email: string
  role?: string
  affiliation: AffiliationType
  organization?: string
  referralSource?: string
  referralSourceOther?: string
  callPurpose?: string
  researchSummary?: string
}

// Team Member Types
export interface TeamMember {
  name: string
  initials: string
  role: string
  email: string
  bio: string
  color: string
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
  teamMembers: Array<{ name: string; role: string; initials: string; color: string; bio: string; email: string }>
  contactPills: Array<{ role: string; name: string; email: string }>
}

// Pipeline Step content model
export interface PipelineStepFields {
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
}

export type PipelineStepEntry = Entry<PipelineStepFields>

// Pipeline Page content model
export interface PipelinePageContent {
  headerOverline: string
  headerTitle: string
  headerDescription: string
  summaryOverline: string
  summaryHeading: string
  summaryMetrics: Array<{ value: string; label: string }>
  pipelineSteps: PipelineStepEntry[]
}

// Services Page content model
export interface ServicesPageContent {
  headerOverline: string
  headerTitle: string
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
  title: string
  description: string
  affiliationInfoInternal: string
  affiliationInfoExternal: string
  affiliationInfoIndustry: string
  sidebarCards: Array<{ title: string; body: string; variant: string }>
}

// Site Settings content model (singleton)
export interface FooterContent {
  organizationName: string
  organizationAddress: string
  billingEmail: string
  partnershipEmail: string
}
