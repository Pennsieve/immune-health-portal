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

// Distribution of draw volume across tube types, per visit (utils/intakeFields.ts).
const TUBE_COUNT_FIELDS: Array<{ key: string; label: string }> = [
  { key: 'tubeCountEdta4ml', label: '4 mL EDTA' },
  { key: 'tubeCountHeparin10ml', label: '10 mL Sodium Heparin' },
  { key: 'tubeCountHeparin6ml', label: '6 mL Sodium Heparin' },
  { key: 'tubeCountSerum10ml', label: '10 mL Serum (SST)' },
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

// The Scope of Work list items read naturally whether the underlying study
// data is fully filled in (dynamic numbers) or still incomplete (falls back
// to a plain-English TBD sentence instead of gluing the TBD phrase into a
// number's position, e.g. "35 subjects recruited (enrollment period TBD)"
// rather than "35 subjects recruited over TBD").
function scopeSubjectsLine(subjectCount: string, enrollmentPeriod: string): string {
  return enrollmentPeriod === TBD
    ? `${subjectCount} subjects recruited (enrollment period ${TBD})`
    : `${subjectCount} subjects recruited over ${enrollmentPeriod}`
}

function scopeVisitsLine(visitCount: string): string {
  return visitCount === TBD ? `Visit schedule ${TBD}` : `${visitCount} visits`
}

function scopeTubeLine(tubeType: string, tubesPerVisit: string): string {
  return tubeType === TBD
    ? `Collection tube type ${TBD}`
    : `Fresh whole blood in ${tubeType}${tubesPerVisit ? `, ${tubesPerVisit} tube(s) per visit` : ''}`
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
  visitCount: string
  tubesPerVisit: string
  scopeSubjectsLine: string
  scopeVisitsLine: string
  scopeTubeLine: string
  hasTier1Service: boolean
  hasCytofService: boolean
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
    visits?: Array<{ id: string; label: string; description?: string }>
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

  const subjectCount = cohort.subjects ? String(cohort.subjects) : TBD
  const totalSamples = cohort.totalSamples ? String(cohort.totalSamples) : TBD
  const tubeType = intake('tubeTypes') || TBD
  const visitCount = cohort.visits?.length ? String(cohort.visits.length) : TBD
  const tubesPerVisit = tubesPerVisitText(intakeDetails)
  const enrollmentPeriod = intake('enrollmentPeriod') || TBD
  const budgetLines = (budget.lines || []).map(l => ({
    service: l.service,
    rate: Number(l.rate),
    planned: Number(l.planned),
    committed: Number(l.committed),
  }))
  const hasTier1Service = budgetLines.some(l => /tier\s*1/i.test(l.service))
  const hasCytofService = budgetLines.some(l => /cytof/i.test(l.service))

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
    subjectCount,
    totalSamples,
    sampleType: cohort.sampleType || TBD,
    cohortCount: cohort.groups?.length || 0,
    tubeType,
    visitCount,
    tubesPerVisit,
    scopeSubjectsLine: scopeSubjectsLine(subjectCount, enrollmentPeriod),
    scopeVisitsLine: scopeVisitsLine(visitCount),
    scopeTubeLine: scopeTubeLine(tubeType, tubesPerVisit),
    hasTier1Service,
    hasCytofService,
    enrollmentPeriod,
    firstSampleDate: intake('firstSampleDate') || TBD,
    objectivesText: study.objectives || TBD,
    isRemotePhlebotomy: /remote/i.test(study.phlebotomy || ''),
    metadataDesc: study.metadata_desc || '',
    fundingAccount: budget.accountCode || TBD,
    fundingName: budget.fundingName || TBD,
    baName: budget.baName || TBD,
    baEmail: budget.baEmail || TBD,
    totalBudget: committed ? `$${Number(committed).toLocaleString()}` : TBD,
    budgetLines,
  }
}
