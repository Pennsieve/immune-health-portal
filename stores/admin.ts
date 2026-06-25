import { defineStore } from 'pinia'
import { AGREEMENT_IDS } from '~/utils/agreements'

export type InquiryStatus = 'New' | 'In Review' | 'Approved' | 'Declined' | 'Stale'
export type StudyStage = 'Review' | 'Agreement' | 'Awaiting Signature' | 'Processing' | 'Complete'
export type Affiliation = 'Internal' | 'External' | 'Industry'

export interface Inquiry {
  id: string
  studyName: string
  abbreviation: string
  submittedDate: string
  createdAt: string
  isStale?: boolean
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
  cohortTimepoints: number
  services: string
  servicesDetail: Array<{ name: string; qty: number; rate: string | number }>
  status: InquiryStatus
  estimate?: number
  sampleType?: string
  phlebotomy?: string
  metadata?: string
  additionalNotes?: string
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
    timepoints: number
    totalSamples: number
    processedSamples: number
    sampleType: string
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
  startedDate?: string
  department?: string
  objectives?: string
  phlebotomy?: string
  metadata?: string
  activity: ActivityItem[]
  lifecycle: Array<{ label: string; date: string; status: 'done' | 'active' | 'pending' }>
  updatedAt: string
  isLocked: boolean
  quickStats?: { samplesReceived: number; samplesTotal: number; cytofAcquired: number; cytofTotal: number; qcPassed: number; qcTotal: number; invoicedYtd: number }
}

function mapInquiry(row: Record<string, unknown>): Inquiry {
  return {
    id: row.id as string,
    studyName: row.study_name as string,
    abbreviation: row.abbreviation as string,
    submittedDate: row.submitted_date as string,
    createdAt: row.created_at as string,
    isStale: row.is_stale as boolean,
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
    irb: row.irb as string,
    cohortSubjects: row.cohort_subjects as number,
    cohortTimepoints: row.cohort_timepoints as number,
    services: row.services as string,
    servicesDetail: (row.services_detail as Array<{ name: string; qty: number; rate: string | number }>) || [],
    status: row.status as InquiryStatus,
    estimate: row.estimate as number | undefined,
    sampleType: row.sample_type as string | undefined,
    phlebotomy: row.phlebotomy as string | undefined,
    metadata: row.metadata as string | undefined,
    additionalNotes: row.additional_notes as string | undefined,
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
    agreements,
    cohort: row.cohort as Study['cohort'],
    budget: row.budget as Study['budget'],
    integrations: (row.integrations as Study['integrations']) || {},
    startedDate: row.started_date as string | undefined,
    department: row.department as string | undefined,
    objectives: row.objectives as string | undefined,
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

    newInquiriesCount: (state) => state.inquiries.filter(i => i.status === 'New' || i.status === 'Stale').length,

    studiesByStage: (state) => (stage: StudyStage) => state.studies.filter(s => s.stage === stage),
  },

  actions: {
    async loadAll() {
      if (this.isLoading) return
      this.isLoading = true
      try {
        const supabase = useSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()
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
      const { data, error } = await supabase
        .from('studies')
        .select('id, name, abbreviation, pi, study_lead, affiliation, affiliation_org, irb, stage, is_locked, cohort, budget, integrations, started_date, department, objectives, phlebotomy, metadata_desc, lifecycle, updated_at, quick_stats, activity, agreements(*)')
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

    async logout() {
      const supabase = useSupabaseClient()
      await supabase.auth.signOut()
      this.inquiries = []
      this.studies = []
      this.isInitialized = false
    },
  },
})
