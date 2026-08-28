// ============================================================
// User Agreement field resolution — single source of truth for
// turning a study record into the display-ready values shown on
// the agreement document (pages/admin/sign/[token].vue).
//
// This is called in two places:
//   - server/api/admin/approve-inquiry.post.ts, once, when the
//     agreement is generated — the result is frozen onto the
//     agreement row as `snapshot` so a signed document stays a
//     true record even if the study's live values change later.
//   - the sign page itself, as a live fallback for agreements
//     that predate the snapshot column (or have none for any
//     other reason).
// ============================================================
import { intakeDisplayValue } from '~/utils/intakeFields'

// Exported so the sign page can detect an unfilled field and render the
// bold "< to be finalized with the I3H team >" placeholder instead of plain text.
export const TBD = 'to be finalized with the I3H team'

// Distribution of draw volume across tube types, per visit (utils/intakeFields.ts).
const TUBE_COUNT_FIELDS: Array<{ key: string; label: string }> = [
  { key: 'tubeCountEdta3ml', label: '3 mL EDTA' },
  { key: 'tubeCountEdta10ml', label: '10 mL EDTA' },
  { key: 'tubeCountHeparin10ml', label: '10 mL Sodium Heparin' },
  { key: 'tubeCountHeparin6ml', label: '6 mL Sodium Heparin' },
  { key: 'tubeCountSerum6ml', label: '6 mL Serum (SST)' },
  { key: 'tubeCountStreck10ml', label: '10 mL Streck' },
]

function tubesPerVisitText(details: Record<string, unknown>): string {
  return TUBE_COUNT_FIELDS
    .map(({ key, label }) => {
      const n = Number(details[key])
      return n > 0 ? `${n} × ${label}` : ''
    })
    .filter(Boolean)
    .join(', ')
}

export interface AgreementBudgetLine {
  service: string
  rate: number
  planned: number
  committed: number
}

export interface AgreementFields {
  studyName: string
  abbreviation: string
  studySynopsis: string
  irb: string
  isInternal: boolean
  affiliationOrg: string
  piName: string
  piEmail: string
  projectLeadName: string
  projectLeadEmail: string
  pointOfContactLine: string
  generatedOn: string
  subjectCount: string
  totalSamples: string
  cohortCount: number
  tubeType: string
  visitCount: string
  tubesPerVisit: string
  hasCytofService: boolean
  hasBloodDrawService: boolean
  enrollmentPeriod: string
  firstSampleDate: string
  fundingAccount: string
  fundingName: string
  baName: string
  baEmail: string
  contractingContact: string
  totalBudget: string
  budgetLines: AgreementBudgetLine[]
}

export interface StudyForAgreement {
  name: string
  abbreviation?: string | null
  irb?: string | null
  affiliation?: string | null
  affiliation_org?: string | null
  pi?: { name: string; email: string } | null
  study_lead?: { name: string; email: string } | null
  cohort?: {
    subjects?: number
    totalSamples?: number
    groups?: Array<Record<string, unknown>>
    visits?: Array<{ id: string; label: string; description?: string }>
  } | null
  budget?: {
    accountCode?: string | null
    fundingName?: string | null
    baName?: string | null
    baEmail?: string | null
    contractingContact?: string | null
    lines?: Array<{ service: string; rate: number; planned: number }>
  } | null
  intake_details?: Record<string, unknown> | null
}

function todayLong(): string {
  return new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

// `generatedOn` should be the date the agreement was actually generated/sent
// (pass the same date used for the study's approval activity log). Omit it
// only for the live-fallback path, where "today" is the best we can do.
export function buildAgreementFields(study: StudyForAgreement, generatedOn?: string): AgreementFields {
  const cohort = study.cohort || {}
  const budget = study.budget || {}
  const intakeDetails = study.intake_details || {}
  const intake = (key: string) => intakeDisplayValue(key, intakeDetails)

  const projectLead = study.study_lead

  const subjectCount = cohort.subjects ? String(cohort.subjects) : TBD
  const totalSamples = cohort.totalSamples ? String(cohort.totalSamples) : TBD
  const tubeType = intake('tubeTypes') || TBD
  const visitCount = cohort.visits?.length ? String(cohort.visits.length) : TBD
  const tubesPerVisit = tubesPerVisitText(intakeDetails)
  const enrollmentPeriod = intake('enrollmentPeriod') || TBD
  // Each line's estimated cost (rate × planned) is computed live rather than
  // read from a persisted "committed" figure — there's no real invoicing
  // system behind this app, so nothing should look tracked that isn't.
  const budgetLines = (budget.lines || []).map(l => ({
    service: l.service,
    rate: Number(l.rate),
    planned: Number(l.planned),
    committed: Number(l.rate) * Number(l.planned),
  }))
  const committed = budgetLines.reduce((sum, l) => sum + l.committed, 0)
  const hasCytofService = budgetLines.some(l => /cytof/i.test(l.service))
  const hasBloodDrawService = budgetLines.some(l => /blood draw/i.test(l.service))

  return {
    studyName: study.name,
    abbreviation: study.abbreviation || '',
    studySynopsis: intake('studySynopsis') || TBD,
    irb: study.irb || TBD,
    isInternal: study.affiliation === 'Internal',
    affiliationOrg: study.affiliation_org || TBD,
    piName: study.pi?.name || TBD,
    piEmail: study.pi?.email || '',
    projectLeadName: projectLead?.name || '',
    projectLeadEmail: projectLead?.email || '',
    pointOfContactLine: projectLead ? `${projectLead.name} <${projectLead.email}>` : TBD,
    generatedOn: generatedOn || todayLong(),
    subjectCount,
    totalSamples,
    cohortCount: cohort.groups?.length || 0,
    tubeType,
    visitCount,
    tubesPerVisit,
    hasCytofService,
    hasBloodDrawService,
    enrollmentPeriod,
    firstSampleDate: intake('firstSampleDate') || TBD,
    fundingAccount: budget.accountCode || TBD,
    fundingName: budget.fundingName || TBD,
    baName: budget.baName || TBD,
    baEmail: budget.baEmail || TBD,
    contractingContact: budget.contractingContact || TBD,
    totalBudget: committed ? `$${Number(committed).toLocaleString()}` : TBD,
    budgetLines,
  }
}
