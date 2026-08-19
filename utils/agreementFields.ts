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

const TBD = 'to be finalized with the I3H team'

export interface AgreementBudgetLine {
  service: string
  rate: number
  planned: number
  committed: number
}

export interface AgreementFields {
  studyName: string
  abbreviation: string
  irb: string
  affiliationOrg: string
  piName: string
  piEmail: string
  projectLeadName: string
  projectLeadEmail: string
  pointOfContactLine: string
  generatedOn: string
  subjectCount: string
  totalSamples: string
  sampleType: string
  cohortCount: number
  tubeType: string
  enrollmentPeriod: string
  firstSampleDate: string
  objectivesText: string
  isRemotePhlebotomy: boolean
  metadataDesc: string
  fundingAccount: string
  fundingName: string
  baName: string
  baEmail: string
  totalBudget: string
  budgetLines: AgreementBudgetLine[]
}

export interface StudyForAgreement {
  name: string
  abbreviation?: string | null
  irb?: string | null
  affiliation_org?: string | null
  pi?: { name: string; email: string } | null
  study_lead?: { name: string; email: string } | null
  cohort?: {
    subjects?: number
    totalSamples?: number
    sampleType?: string
    groups?: Array<Record<string, unknown>>
  } | null
  budget?: {
    committed?: number
    accountCode?: string | null
    fundingName?: string | null
    baName?: string | null
    baEmail?: string | null
    lines?: Array<{ service: string; rate: number; planned: number; committed: number }>
  } | null
  objectives?: string | null
  phlebotomy?: string | null
  metadata_desc?: string | null
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
  const committed = budget.committed

  return {
    studyName: study.name,
    abbreviation: study.abbreviation || '',
    irb: study.irb || TBD,
    affiliationOrg: study.affiliation_org || TBD,
    piName: study.pi?.name || TBD,
    piEmail: study.pi?.email || '',
    projectLeadName: projectLead?.name || '',
    projectLeadEmail: projectLead?.email || '',
    pointOfContactLine: projectLead ? `${projectLead.name} <${projectLead.email}>` : TBD,
    generatedOn: generatedOn || todayLong(),
    subjectCount: cohort.subjects ? String(cohort.subjects) : TBD,
    totalSamples: cohort.totalSamples ? String(cohort.totalSamples) : TBD,
    sampleType: cohort.sampleType || TBD,
    cohortCount: cohort.groups?.length || 1,
    tubeType: intake('tubeTypes') || TBD,
    enrollmentPeriod: intake('enrollmentPeriod') || TBD,
    firstSampleDate: intake('firstSampleDate') || TBD,
    objectivesText: study.objectives || TBD,
    isRemotePhlebotomy: /remote/i.test(study.phlebotomy || ''),
    metadataDesc: study.metadata_desc || '',
    fundingAccount: budget.accountCode || TBD,
    fundingName: budget.fundingName || TBD,
    baName: budget.baName || TBD,
    baEmail: budget.baEmail || TBD,
    totalBudget: committed ? `$${Number(committed).toLocaleString()}` : TBD,
    budgetLines: (budget.lines || []).map(l => ({
      service: l.service,
      rate: Number(l.rate),
      planned: Number(l.planned),
      committed: Number(l.committed),
    })),
  }
}
