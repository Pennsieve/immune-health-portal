import { defineStore } from 'pinia'
import { AGREEMENT_IDS } from '~/utils/agreements'

// Lifecycle: 'Lead' (simple lead form submitted) → 'Intake Sent' (full-intake
// link emailed) → 'New' (full intake received, awaiting review) → terminal.
export type InquiryStatus = 'Lead' | 'Intake Sent' | 'New' | 'Approved' | 'Declined'
// A study is created at 'Awaiting Signature' (approve-inquiry), moves to
// 'Processing' once all agreements are signed, then 'Complete'. The former
// 'Review' and 'Agreement' stages were never assigned by any code path.
export type StudyStage = 'Awaiting Signature' | 'Processing' | 'Complete'
export type Affiliation = 'Internal' | 'External' | 'Industry'

export interface Inquiry {
  id: string
  studyName: string
  abbreviation: string
  submittedDate: string
  createdAt: string
  objectives: string
  pi: { name: string; email: string }
  studyLead?: { name: string; email: string }
  affiliation: Affiliation
  affiliationOrg: string
  budgetCode?: string
  fundingName?: string
  baName?: string
  baEmail?: string
  contractingContact?: string
  irb: string
  cohortSubjects: number
  services: string
  servicesDetail: Array<{ name: string; qty: number; rate: string | number }>
  status: InquiryStatus
  estimate?: number
  sampleType?: string
  phlebotomy?: string
  metadata?: string
  additionalNotes?: string
  intakeDetails?: Record<string, unknown>
  leadDetails?: Record<string, unknown>
  intakeSentDate?: string
  collectionGroups?: Array<{ name: string; subjects: number; samples: Record<string, number> }>
  notes: Array<{ author: string; date: string; text: string }>
  feasibility: Array<{ label: string; checked: boolean }>
}

export interface Agreement {
  id: string
  name: string
  description: string
  status: 'Signed' | 'Pending'
  signedBy?: string
  signedDate?: string
  signedEmail?: string
  sentDate?: string
  reminderDate?: string
}

export interface ActivityItem {
  dotClass: string
  title: string
  date: string
  author?: string
  note?: string
  ts?: number
}

export interface Study {
  id: string
  name: string
  abbreviation: string
  pi: { name: string; email: string }
  studyLead?: { name: string; email: string }
  affiliation: Affiliation
  affiliationOrg: string
  irb: string
  stage: StudyStage
  agreements: Agreement[]
  cohort: {
    subjects: number
    totalSamples: number
    processedSamples: number
    sampleType: string
    groups?: Array<{ name: string; subjects: number; samples: Record<string, number> }>
  }
  budget: {
    committed: number
    invoiced: number
    remaining: number
    pctInvoiced: number
    accountCode?: string
    fundingName?: string
    baName?: string
    baEmail?: string
    contractingContact?: string
    billingContact?: string
    lines: Array<{ service: string; rate: number; planned: number; completed: number; committed: number; invoiced: number }>
  }
  integrations: { redcap?: string; labvantage?: string; pennsieve?: string }
  intakeDetails?: Record<string, unknown>
  startedDate?: string
  department?: string
  objectives?: string
  additionalNotes?: string
  phlebotomy?: string
  metadata?: string
  activity: ActivityItem[]
  lifecycle: Array<{ label: string; date: string; status: 'done' | 'active' | 'pending' }>
  updatedAt: string
  isLocked: boolean
  statusTokenVersion: number
  quickStats?: { samplesReceived: number; samplesTotal: number; cytofAcquired: number; cytofTotal: number; qcPassed: number; qcTotal: number; invoicedYtd: number }
}

function mapInquiry(row: Record<string, unknown>): Inquiry {
  return {
    id: row.id as string,
    // Leads have no study name until the full intake is submitted
    studyName: (row.study_name as string) || '',
    abbreviation: row.abbreviation as string,
    submittedDate: row.submitted_date as string,
    createdAt: row.created_at as string,
    objectives: row.objectives as string,
    pi: row.pi as { name: string; email: string },
    studyLead: row.study_lead as { name: string; email: string } | undefined,
    affiliation: row.affiliation as Affiliation,
    affiliationOrg: row.affiliation_org as string,
    budgetCode: row.budget_code as string | undefined,
    fundingName: row.funding_name as string | undefined,
    baName: row.ba_name as string | undefined,
    baEmail: row.ba_email as string | undefined,
    contractingContact: row.contracting_contact as string | undefined,
    irb: (row.irb as string) || '',
    cohortSubjects: (row.cohort_subjects as number) || 0,
    services: (row.services as string) || '',
    servicesDetail: (row.services_detail as Array<{ name: string; qty: number; rate: string | number }>) || [],
    status: row.status as InquiryStatus,
    estimate: row.estimate as number | undefined,
    sampleType: row.sample_type as string | undefined,
    phlebotomy: row.phlebotomy as string | undefined,
    metadata: row.metadata as string | undefined,
    additionalNotes: row.additional_notes as string | undefined,
    intakeDetails: (row.intake_details as Record<string, unknown>) || {},
    leadDetails: (row.lead_details as Record<string, unknown>) || {},
    intakeSentDate: row.intake_sent_date as string | undefined,
    collectionGroups: (row.sample_schedule as Array<{ name: string; subjects: number; samples: Record<string, number> }>) || [],
    notes: (row.notes as Array<{ author: string; date: string; text: string }>) || [],
    feasibility: (row.feasibility as Array<{ label: string; checked: boolean }>) || [],
  }
}

function normalizeLifecycle(steps: Study['lifecycle']): Study['lifecycle'] {
  return steps.map((step, i) => {
    const laterStepIsDone = steps.slice(i + 1).some(s => s.status === 'done')
    if (laterStepIsDone && step.status !== 'done') {
      const placeholders = ['in progress', '—', '']
      const nextDone = steps.slice(i + 1).find(s => s.status === 'done')
      const date = placeholders.includes(step.date) ? (nextDone?.date ?? step.date) : step.date
      return { ...step, status: 'done', date }
    }
    return step
  })
}

function mapStudy(row: Record<string, unknown>, agreements: Agreement[]): Study {
  return {
    id: row.id as string,
    name: row.name as string,
    abbreviation: row.abbreviation as string,
    pi: row.pi as { name: string; email: string },
    studyLead: row.study_lead as { name: string; email: string } | undefined,
    affiliation: row.affiliation as Affiliation,
    affiliationOrg: row.affiliation_org as string,
    irb: row.irb as string,
    stage: row.stage as StudyStage,
    isLocked: row.is_locked as boolean,
    statusTokenVersion: (row.status_token_version as number) ?? 1,
    agreements,
    cohort: row.cohort as Study['cohort'],
    budget: row.budget as Study['budget'],
    integrations: (row.integrations as Study['integrations']) || {},
    intakeDetails: (row.intake_details as Record<string, unknown>) || {},
    startedDate: row.started_date as string | undefined,
    department: row.department as string | undefined,
    objectives: row.objectives as string | undefined,
    additionalNotes: row.additional_notes as string | undefined,
    phlebotomy: row.phlebotomy as string | undefined,
    metadata: row.metadata_desc as string | undefined,
    activity: (row.activity as ActivityItem[]) || [],
    lifecycle: normalizeLifecycle((row.lifecycle as Study['lifecycle']) || []),
    updatedAt: row.updated_at as string,
    quickStats: row.quick_stats as Study['quickStats'],
  }
}

function mapAgreement(row: Record<string, unknown>): Agreement {
  return {
    id: row.id as string,
    name: row.name as string,
    description: row.description as string,
    status: row.status as 'Signed' | 'Pending',
    signedBy: row.signed_by as string | undefined,
    signedDate: row.signed_date as string | undefined,
    signedEmail: row.signed_email as string | undefined,
    sentDate: row.sent_date as string | undefined,
    reminderDate: row.reminder_date as string | undefined,
  }
}

export const useAdminStore = defineStore('admin', {
  state: () => ({
    user: {
      name: '',
      email: '',
      initials: '',
      role: 'Admin',
    },
    inquiries: [] as Inquiry[],
    studies: [] as Study[],
    sessionEvents: [] as ActivityItem[],
    isLoading: false,
    isInitialized: false,
  }),

  getters: {
    signedInAgreementsCount: (state) => (studyId: string) => {
      const study = state.studies.find(s => s.id === studyId)
      if (!study) return 0
      return study.agreements.filter(a => a.status === 'Signed').length
    },

    // Everything that needs admin attention: fresh leads + full intakes awaiting review
    newInquiriesCount: (state) => state.inquiries.filter(i => i.status === 'New' || i.status === 'Lead').length,

    studiesByStage: (state) => (stage: StudyStage) => state.studies.filter(s => s.stage === stage),
  },

  actions: {
    async loadAll() {
      if (this.isLoading) return
      this.isLoading = true
      try {
        const { getUser } = useAuth()
        const { data: { user } } = await getUser()
        if (user) {
          const meta = user.user_metadata || {}
          const fullName = meta.full_name || meta.name || user.email?.split('@')[0] || 'Admin'
          const initials = fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
          this.user = { name: fullName, email: user.email || '', initials, role: 'Admin' }
        }
        await Promise.all([this.loadInquiries(), this.loadStudies()])
        this.isInitialized = true
      }
      finally {
        this.isLoading = false
      }
    },

    async loadInquiries() {
      const supabase = useSupabaseClient()
      const { data, error } = await supabase
        .from('inquiries')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      this.inquiries = (data || []).map(row => mapInquiry(row as Record<string, unknown>))
    },

    async loadStudies() {
      const supabase = useSupabaseClient()
      // Select every column (+ embedded agreements). An explicit column list
      // previously omitted intake_details / additional_notes / status_token_version,
      // so those never reached the client — keep this as '*' to avoid that class of bug.
      const { data, error } = await supabase
        .from('studies')
        .select('*, agreements(*)')
        .order('updated_at', { ascending: false })
      if (error) throw error

      this.studies = (data || []).map((row) => {
        const agreementsRaw = (row.agreements as Array<Record<string, unknown>>) || []
        const agreements = AGREEMENT_IDS
          .map(id => agreementsRaw.find(a => a.id === id))
          .filter(Boolean)
          .map(a => mapAgreement(a as Record<string, unknown>))
        return mapStudy(row as Record<string, unknown>, agreements)
      })
    },

    async loadStudyActivity(studyId: string) {
      const supabase = useSupabaseClient()
      const { data } = await supabase
        .from('studies')
        .select('activity')
        .eq('id', studyId)
        .single()
      const study = this.studies.find(s => s.id === studyId)
      if (study && data?.activity) {
        study.activity = data.activity as ActivityItem[]
      }
    },

    async signAgreement(studyId: string, agreementId: string, signerName: string, signerEmail: string) {
      const supabase = useSupabaseClient()
      const now = new Date()
      const signedDate = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        + ' at ' + now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

      const { error } = await supabase
        .from('agreements')
        .update({ status: 'Signed', signed_by: signerName, signed_date: signedDate, signed_email: signerEmail })
        .eq('study_id', studyId)
        .eq('id', agreementId)

      if (error) throw error

      // Update local state immediately (no full reload needed)
      const study = this.studies.find(s => s.id === studyId)
      if (study) {
        const agreement = study.agreements.find(a => a.id === agreementId)
        if (agreement) {
          agreement.status = 'Signed'
          agreement.signedBy = signerName
          agreement.signedDate = signedDate
          agreement.signedEmail = signerEmail
        }

        const allSigned = study.agreements.every(a => a.status === 'Signed')
        if (allSigned) {
          const activationItem: ActivityItem = {
            dotClass: 'g',
            title: 'All agreements signed — study activated',
            date: signedDate,
            ts: Date.now(),
          }
          const updatedActivity = [activationItem, ...study.activity]

          await supabase
            .from('studies')
            .update({
              is_locked: false,
              stage: 'Processing',
              activity: updatedActivity,
              lifecycle: study.lifecycle.map((step) => {
                if (step.label === 'Agreements') return { ...step, date: signedDate, status: 'done' }
                if (step.label === 'Activated') return { ...step, date: signedDate, status: 'done' }
                if (step.label === 'Processing') return { ...step, date: 'in progress', status: 'active' }
                return step
              }),
            })
            .eq('id', studyId)

          study.isLocked = false
          study.stage = 'Processing'
          study.activity = updatedActivity
          study.lifecycle = study.lifecycle.map(step => {
            if (step.label === 'Agreements') return { ...step, date: signedDate, status: 'done' }
            if (step.label === 'Activated') return { ...step, date: signedDate, status: 'done' }
            if (step.label === 'Processing') return { ...step, date: 'in progress', status: 'active' }
            return step
          })
        }
      }
    },

    async updateProcessedSamples(studyId: string, processedSamples: number) {
      const result = await $fetch<{ success: boolean; cohort: Study['cohort']; budget: Study['budget']; activityItem: ActivityItem }>('/api/admin/update-study-samples', {
        method: 'POST',
        body: { studyId, processedSamples, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone },
      })
      const study = this.studies.find(s => s.id === studyId)
      if (study) {
        study.cohort = result.cohort
        study.budget = result.budget
        study.activity.unshift(result.activityItem)
      }
    },

    async updateStudy(studyId: string, fields: {
      name: string
      abbreviation: string
      pi: { name: string; email: string }
      studyLead?: { name: string; email: string }
      affiliation: Affiliation
      affiliationOrg: string
      irb: string
      stage: StudyStage
      objectives?: string
      phlebotomy?: string
      metadata?: string
      cohort: Study['cohort']
      budget: Study['budget']
      intakeDetails?: Record<string, unknown>
    }, changeNote?: string) {
      const result = await $fetch<{ success: boolean; activityItem: ActivityItem; lifecycle: Study['lifecycle'] }>('/api/admin/update-study', {
        method: 'POST',
        body: { studyId, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, changeNote, ...fields },
      })
      const study = this.studies.find(s => s.id === studyId)
      if (study) {
        study.name = fields.name
        study.abbreviation = fields.abbreviation
        study.pi = fields.pi
        study.studyLead = fields.studyLead
        study.affiliation = fields.affiliation
        study.affiliationOrg = fields.affiliationOrg
        study.irb = fields.irb
        study.stage = fields.stage
        study.objectives = fields.objectives
        study.phlebotomy = fields.phlebotomy
        study.metadata = fields.metadata
        Object.assign(study.cohort, fields.cohort)
        Object.assign(study.budget, fields.budget)
        if (fields.intakeDetails !== undefined) study.intakeDetails = fields.intakeDetails
        study.lifecycle = result.lifecycle
        study.activity.unshift(result.activityItem)
      }
    },

    async deleteStudy(studyId: string) {
      const study = this.studies.find(s => s.id === studyId)
      const studyName = study?.name ?? studyId

      await $fetch('/api/admin/delete-study', {
        method: 'POST',
        body: { studyId },
      })

      this.studies = this.studies.filter(s => s.id !== studyId)

      const now = new Date()
      const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        + ' · ' + now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

      this.sessionEvents.unshift({
        dotClass: 'w',
        title: `Study deleted — ${studyName}`,
        date: dateStr,
        ts: Date.now(),
      })
    },

    async updateInquiry(inquiryId: string, fields: {
      studyName: string
      abbreviation: string
      pi: { name: string; email: string }
      studyLead?: { name: string; email: string }
      affiliation: Affiliation
      affiliationOrg: string
      irb: string
      objectives?: string
      phlebotomy?: string
      metadata?: string
      sampleType?: string
      cohortSubjects: number
      servicesDetail: Array<{ name: string; qty: number; rate: string | number }>
      budgetCode?: string
      fundingName?: string
      baName?: string
      baEmail?: string
      contractingContact?: string
      estimate?: number
      intakeDetails?: Record<string, unknown>
      collectionGroups?: Array<{ name: string; subjects: number; samples: Record<string, number> }>
    }) {
      await $fetch('/api/admin/update-inquiry', {
        method: 'POST',
        body: { inquiryId, ...fields },
      })
      const inquiry = this.inquiries.find(i => i.id === inquiryId)
      if (inquiry) {
        inquiry.studyName = fields.studyName
        inquiry.abbreviation = fields.abbreviation
        inquiry.pi = fields.pi
        inquiry.studyLead = fields.studyLead
        inquiry.affiliation = fields.affiliation
        inquiry.affiliationOrg = fields.affiliationOrg
        inquiry.irb = fields.irb
        inquiry.objectives = fields.objectives || ''
        inquiry.phlebotomy = fields.phlebotomy
        inquiry.metadata = fields.metadata
        inquiry.sampleType = fields.sampleType
        inquiry.cohortSubjects = fields.cohortSubjects
        inquiry.servicesDetail = fields.servicesDetail
        inquiry.services = fields.servicesDetail.map(s => s.name).join(', ')
        inquiry.budgetCode = fields.budgetCode
        inquiry.fundingName = fields.fundingName
        inquiry.baName = fields.baName
        inquiry.baEmail = fields.baEmail
        inquiry.contractingContact = fields.contractingContact
        inquiry.estimate = fields.estimate
        if (fields.intakeDetails !== undefined) inquiry.intakeDetails = fields.intakeDetails
        if (fields.collectionGroups !== undefined) inquiry.collectionGroups = fields.collectionGroups
      }
    },

    // Email the tokenized full-intake link to a lead (or re-send it)
    async sendIntakeLink(inquiryId: string) {
      const { sentDate } = await $fetch<{ success: boolean; sentDate: string }>('/api/admin/send-intake-link', {
        method: 'POST',
        body: { inquiryId, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone },
      })
      const inquiry = this.inquiries.find(i => i.id === inquiryId)
      if (inquiry) {
        inquiry.status = 'Intake Sent'
        inquiry.intakeSentDate = sentDate
      }
      return sentDate
    },

    async logout() {
      const { signOut } = useAuth()
      await signOut()
      this.inquiries = []
      this.studies = []
      this.isInitialized = false
    },
  },
})
