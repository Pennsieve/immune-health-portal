import { defineStore } from 'pinia'

export type InquiryStatus = 'New' | 'In Review' | 'Approved' | 'Declined' | 'Stale'
export type StudyStage = 'Review' | 'Agreement' | 'Awaiting Signature' | 'Processing' | 'Complete'
export type Affiliation = 'Internal' | 'External' | 'Industry'

export interface Inquiry {
  id: string
  studyName: string
  abbreviation: string
  submittedDate: string
  submittedRelative: string
  isStale?: boolean
  objectives: string
  pi: { name: string; email: string }
  studyLead?: { name: string; email: string }
  affiliation: Affiliation
  affiliationOrg: string
  irb: string
  cohortSubjects: number
  cohortTimepoints: number
  services: string
  servicesDetail: Array<{ name: string; qty: number; rate: string }>
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
  updatedRelative: string
  isLocked: boolean
  quickStats?: { samplesReceived: number; samplesTotal: number; cytofAcquired: number; cytofTotal: number; qcPassed: number; qcTotal: number; invoicedYtd: number }
}

function mapInquiry(row: Record<string, unknown>): Inquiry {
  return {
    id: row.id as string,
    studyName: row.study_name as string,
    abbreviation: row.abbreviation as string,
    submittedDate: row.submitted_date as string,
    submittedRelative: row.submitted_relative as string,
    isStale: row.is_stale as boolean,
    objectives: row.objectives as string,
    pi: row.pi as { name: string; email: string },
    studyLead: row.study_lead as { name: string; email: string } | undefined,
    affiliation: row.affiliation as Affiliation,
    affiliationOrg: row.affiliation_org as string,
    irb: row.irb as string,
    cohortSubjects: row.cohort_subjects as number,
    cohortTimepoints: row.cohort_timepoints as number,
    services: row.services as string,
    servicesDetail: (row.services_detail as Array<{ name: string; qty: number; rate: string }>) || [],
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
    updatedRelative: row.updated_relative as string,
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
        .select('*, agreements(*)')
        .order('updated_at', { ascending: false })
      if (error) throw error

      this.studies = (data || []).map((row) => {
        const agreementsRaw = (row.agreements as Array<Record<string, unknown>>) || []
        const agreementOrder = ['ua', 'rs', 'lv', 'psa']
        const agreements = agreementOrder
          .map(id => agreementsRaw.find(a => a.id === id))
          .filter(Boolean)
          .map(a => mapAgreement(a as Record<string, unknown>))
        return mapStudy(row as Record<string, unknown>, agreements)
      })
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
              lifecycle: study.lifecycle.map((step, i) => {
                if (i === 3) return { ...step, date: signedDate, status: 'done' }
                if (i === 4) return { ...step, date: 'today', status: 'done' }
                if (i === 5) return { ...step, date: 'in progress', status: 'active' }
                return step
              }),
            })
            .eq('id', studyId)

          study.isLocked = false
          study.stage = 'Processing'
          study.activity = updatedActivity
          study.lifecycle[3] = { ...study.lifecycle[3], date: signedDate, status: 'done' }
          study.lifecycle[4] = { label: 'Activated', date: 'today', status: 'done' }
          study.lifecycle[5] = { label: 'Processing', date: 'in progress', status: 'active' }
        }
      }
    },

    async updateProcessedSamples(studyId: string, processedSamples: number) {
      const result = await $fetch<{ success: boolean; cohort: Study['cohort']; budget: Study['budget']; activityItem: ActivityItem }>('/api/admin/update-study-samples', {
        method: 'POST',
        body: { studyId, processedSamples },
      })
      const study = this.studies.find(s => s.id === studyId)
      if (study) {
        study.cohort = result.cohort
        study.budget = result.budget
        study.activity.unshift(result.activityItem)
      }
    },

    async updateStudyName(studyId: string, name: string) {
      const result = await $fetch<{ success: boolean; activityItem: ActivityItem }>('/api/admin/update-study', {
        method: 'POST',
        body: { studyId, name },
      })
      const study = this.studies.find(s => s.id === studyId)
      if (study) {
        study.name = name
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
