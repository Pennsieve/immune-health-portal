<script setup lang="ts">
import { useAdminStore } from '~/stores/admin'
import type { Affiliation, StudyStage } from '~/stores/admin'
import { useServicesStore } from '~/stores/services'
import type { CollectionVisit } from '~/types/index'
import { INTAKE_FIELDS, INTAKE_SECTIONS, intakeDetailRows, cleanIntakeDetails } from '~/utils/intakeFields'
import { diffStudyDetails, type StudyChange, type StudyDetailSnapshot } from '~/utils/studyChanges'

definePageMeta({ layout: 'admin' })

const route = useRoute()
const adminStore = useAdminStore()

const study = computed(() => adminStore.studies.find(s => s.id === route.params.id))

// Cohort sample matrix (read-only display on the overview)
type CohortGroup = { name: string; description?: string; subjects: number; samples: Record<string, number> }
const visits = computed(() => study.value?.cohort.visits ?? [])
const cohortGroups = computed<CohortGroup[]>(() => study.value?.cohort.groups ?? [])
const groupTotal = (g: CohortGroup, visitList: CollectionVisit[]) =>
  (Number(g.subjects) || 0) * visitList.reduce((s, v) => s + (Number(g.samples?.[v.id]) || 0), 0)
const matrixGrandTotal = computed(() =>
  cohortGroups.value.reduce((s, g) => s + groupTotal(g, visits.value), 0),
)
// Generate a stable id for a new visit column (used as the key in every
// group's `samples` map)
function newVisitId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `v-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}
// Read-only rows for the expanded intake answers (schema-driven)
const detailRows = computed(() => intakeDetailRows(study.value?.intakeDetails))
const fieldsBySection = INTAKE_SECTIONS.map(section => ({
  section,
  fields: INTAKE_FIELDS.filter(f => f.section === section),
}))
// Blood Collection combines the Regulatory volume fields with the Samples
// section (tube types / counts) under one heading.
const bloodCollectionFields = [
  ...(fieldsBySection.find(g => g.section === 'Regulatory')?.fields ?? []).filter(f => f.key !== 'irbStatus'),
  ...(fieldsBySection.find(g => g.section === 'Samples')?.fields ?? []),
]

const keyPersonnel = computed(() => study.value?.keyPersonnel || [])

// Hero scope label: subjects · cohorts · samples
const cohortScopeLabel = computed(() => {
  const c = study.value?.cohort
  if (!c) return ''
  const n = cohortGroups.value.length
  return `${c.subjects} subjects · ${n} cohort${n === 1 ? '' : 's'} · ${c.totalSamples} samples`
})

if (!study.value) {
  navigateTo('/admin/studies')
}

const activeTab = ref('overview')

// Estimated total (rate × planned) — computed live rather than tracked,
// since there's no real invoicing system behind this app.
const budgetEstimatedTotal = computed(() =>
  (study.value?.budget.lines ?? []).reduce((sum, l) => sum + l.rate * l.planned, 0),
)

const signedCount = computed(() =>
  study.value ? study.value.agreements.filter(a => a.status === 'Signed').length : 0
)

function openAgreementsTab() {
  activeTab.value = 'agreements'
}

const sendingLink = ref<string | null>(null)
const sentLink = ref<Set<string>>(new Set())

async function sendSignLink(studyId: string, agreementId: string) {
  const key = `${studyId}-${agreementId}`
  sendingLink.value = key
  try {
    await $fetch('/api/admin/send-sign-link', {
      method: 'POST',
      body: { studyId, agreementId, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone },
    })
    sentLink.value = new Set([...sentLink.value, key])
  }
  catch {
    alert('Failed to send signing link. Please try again.')
  }
  finally {
    sendingLink.value = null
  }
}

const editingSamples = ref(false)
const samplesInput = ref(0)
const isSavingSamples = ref(false)

function startEditSamples() {
  samplesInput.value = study.value?.cohort.processedSamples ?? 0
  editingSamples.value = true
}

async function saveSamples() {
  if (!study.value) return
  const val = Math.max(0, Math.min(Number(samplesInput.value) || 0, study.value.cohort.totalSamples))
  isSavingSamples.value = true
  try {
    await adminStore.updateProcessedSamples(study.value.id, val)
    editingSamples.value = false
  }
  catch {
    alert('Failed to save. Please try again.')
  }
  finally {
    isSavingSamples.value = false
  }
}

const isSavingStage = ref(false)
const stageConfirmTarget = ref<'Complete' | 'Processing' | null>(null)

async function confirmStageChange() {
  if (!study.value || !stageConfirmTarget.value) return
  isSavingStage.value = true
  try {
    await adminStore.updateStudyStage(study.value.id, stageConfirmTarget.value)
    stageConfirmTarget.value = null
  }
  catch {
    alert('Failed to update stage. Please try again.')
  }
  finally {
    isSavingStage.value = false
  }
}

const noteText = ref('')
const isPostingNote = ref(false)

async function postNote() {
  if (!study.value || !noteText.value.trim()) return
  isPostingNote.value = true
  try {
    const { activityItem } = await $fetch('/api/admin/add-study-note', {
      method: 'POST',
      body: { studyId: study.value.id, text: noteText.value, author: adminStore.user.name, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone },
    }) as { activityItem: { dotClass: string; title: string; date: string; note: string; ts: number } }
    study.value.activity.unshift(activityItem)
    noteText.value = ''
  }
  catch {
    alert('Failed to save note. Please try again.')
  }
  finally {
    isPostingNote.value = false
  }
}

const servicesStore = useServicesStore()

// Load services for the "add service" dropdown if not already cached
onMounted(async () => {
  if (servicesStore.services.length === 0) {
    await servicesStore.fetchServices()
  }
})

const editOpen = ref(false)
const isSaving = ref(false)
const newServiceId = ref('')

const hasChanges = computed(() => {
  if (!study.value || !editOpen.value) return false
  const s = study.value
  if (editForm.name.trim() !== s.name) return true
  if (editForm.abbreviation.trim() !== (s.abbreviation ?? '')) return true
  if (editForm.affiliation !== s.affiliation) return true
  if (editForm.piName.trim() !== s.pi.name || editForm.piEmail.trim() !== s.pi.email) return true
  if (editForm.studyLeadName.trim() !== (s.studyLead?.name ?? '') || editForm.studyLeadEmail.trim() !== (s.studyLead?.email ?? '')) return true
  if (editForm.irb.trim() !== (s.irb ?? '')) return true
  if (editForm.additionalNotes.trim() !== (s.additionalNotes ?? '')) return true
  if (JSON.stringify(editForm.visits) !== JSON.stringify(s.cohort.visits ?? [])) return true
  if (JSON.stringify(normalizeGroups(editForm.cohortGroups, editForm.visits)) !== JSON.stringify(normalizeGroups(s.cohort.groups ?? [], editForm.visits))) return true
  if (editForm.accountCode.trim() !== (s.budget.accountCode ?? '')) return true
  if (editForm.fundingName.trim() !== (s.budget.fundingName ?? '')) return true
  if (editForm.baName.trim() !== (s.budget.baName ?? '')) return true
  if (editForm.baEmail.trim() !== (s.budget.baEmail ?? '')) return true
  if (editForm.contractingContact.trim() !== (s.budget.contractingContact ?? '')) return true
  const origLines = s.budget.lines || []
  if (editForm.budgetLines.length !== origLines.length) return true
  const origMap = new Map(origLines.map(l => [l.service, l.planned]))
  for (const l of editForm.budgetLines) {
    const origPlanned = origMap.get(l.service)
    if (origPlanned === undefined || origPlanned !== Math.max(0, l.planned || 0)) return true
  }
  if (JSON.stringify(cleanIntakeDetails(editForm.intakeDetails)) !== JSON.stringify(cleanIntakeDetails(s.intakeDetails ?? {}))) return true
  if (JSON.stringify(normalizePersonnel(editForm.keyPersonnel)) !== JSON.stringify(normalizePersonnel(s.keyPersonnel ?? []))) return true
  return false
})

type BudgetLine = { service: string; rate: number; planned: number }

const editForm = reactive({
  name: '',
  abbreviation: '',
  piName: '',
  piEmail: '',
  studyLeadName: '',
  studyLeadEmail: '',
  affiliation: 'Internal' as Affiliation,
  affiliationOrg: '',
  irb: '',
  stage: 'Awaiting Signature' as StudyStage,
  accountCode: '',
  fundingName: '',
  baName: '',
  baEmail: '',
  contractingContact: '',
  additionalNotes: '',
  cohortGroups: [] as CohortGroup[],
  visits: [] as CollectionVisit[],
  budgetLines: [] as BudgetLine[],
  intakeDetails: {} as Record<string, unknown>,
  keyPersonnel: [] as Array<{ name: string; email: string; role: string }>,
})

// Drop blank rows and trim whitespace so empty "+ Add another person" rows
// left untouched don't get saved.
function normalizePersonnel(people: Array<{ name: string; email: string; role: string }>) {
  return people
    .map(p => ({ name: (p.name || '').trim(), email: (p.email || '').trim(), role: (p.role || '').trim() }))
    .filter(p => p.name || p.email || p.role)
}
function addEditPerson() {
  editForm.keyPersonnel.push({ name: '', email: '', role: '' })
}
function removeEditPerson(i: number) {
  editForm.keyPersonnel.splice(i, 1)
}

// Normalise a cohort matrix to numeric cells, keyed by the given visit list,
// for comparison / saving
function normalizeGroups(groups: CohortGroup[], visitList: CollectionVisit[]): CohortGroup[] {
  return groups.map(g => ({
    name: g.name || '',
    description: g.description || '',
    subjects: Number(g.subjects) || 0,
    samples: Object.fromEntries(visitList.map(v => [v.id, Number(g.samples?.[v.id]) || 0])),
  }))
}
function addEditGroup() {
  editForm.cohortGroups.push({
    name: '',
    description: '',
    subjects: 0,
    samples: Object.fromEntries(editForm.visits.map(v => [v.id, 0])),
  })
}
function removeEditGroup(i: number) {
  editForm.cohortGroups.splice(i, 1)
}
function addEditVisit() {
  const visit: CollectionVisit = { id: newVisitId(), label: '', description: '' }
  editForm.visits.push(visit)
  editForm.cohortGroups.forEach((g) => { g.samples[visit.id] = 0 })
}
function removeEditVisit(i: number) {
  const visit = editForm.visits[i]
  if (!visit) return
  const hasData = editForm.cohortGroups.some(g => Number(g.samples?.[visit.id]) > 0)
  if (hasData && !confirm(`Remove "${visit.label || 'this visit'}"? This will discard the sample counts already entered for it across every cohort.`)) return
  editForm.visits.splice(i, 1)
  editForm.cohortGroups.forEach((g) => {
    const { [visit.id]: _removed, ...rest } = g.samples
    g.samples = rest
  })
}
// Cohort scope derived from the edited matrix
const editMatrixSubjects = computed(() =>
  editForm.cohortGroups.reduce((s, g) => s + (Number(g.subjects) || 0), 0),
)
const editMatrixTotal = computed(() =>
  editForm.cohortGroups.reduce(
    (s, g) => s + (Number(g.subjects) || 0) * editForm.visits.reduce((a, v) => a + (Number(g.samples?.[v.id]) || 0), 0),
    0,
  ),
)

const availableToAdd = computed(() =>
  servicesStore.activeServices.filter(
    svc => !editForm.budgetLines.some(l => l.service === svc.name),
  ),
)

function addServiceLine() {
  if (!newServiceId.value) return
  const svc = servicesStore.services.find(s => s.id === newServiceId.value)
  if (!svc) return
  const rate = editForm.affiliation === 'Internal' ? (svc.internalRate ?? 0) : (svc.externalRate ?? 0)
  editForm.budgetLines.push({ service: svc.name, rate, planned: 1 })
  newServiceId.value = ''
}

function removeServiceLine(i: number) {
  editForm.budgetLines.splice(i, 1)
}

const deleteOpen = ref(false)
const isDeleting = ref(false)

const regenerateOpen = ref(false)
const isRegenerating = ref(false)
const regenerateCopied = ref(false)

async function regenerateStatusLink() {
  if (!study.value) return
  isRegenerating.value = true
  try {
    const { statusUrl } = await $fetch<{ statusUrl: string }>('/api/admin/regenerate-status-link', {
      method: 'POST',
      body: { studyId: study.value.id },
    })
    study.value.statusTokenVersion++
    regenerateOpen.value = false
    await navigator.clipboard.writeText(statusUrl)
    regenerateCopied.value = true
    setTimeout(() => { regenerateCopied.value = false }, 3000)
  }
  catch (e: unknown) {
    const msg = (e as { data?: { statusMessage?: string } })?.data?.statusMessage ?? 'Unknown error'
    alert(`Failed to regenerate link: ${msg}`)
  }
  finally {
    isRegenerating.value = false
  }
}

async function confirmDelete() {
  if (!study.value) return
  isDeleting.value = true
  try {
    await adminStore.deleteStudy(study.value.id)
    navigateTo('/admin/studies')
  }
  catch {
    alert('Failed to delete study. Please try again.')
    isDeleting.value = false
  }
}

function openEdit() {
  if (!study.value) return
  editForm.name = study.value.name
  editForm.abbreviation = study.value.abbreviation
  editForm.piName = study.value.pi.name
  editForm.piEmail = study.value.pi.email
  editForm.studyLeadName = study.value.studyLead?.name ?? ''
  editForm.studyLeadEmail = study.value.studyLead?.email ?? ''
  editForm.affiliation = study.value.affiliation
  editForm.affiliationOrg = study.value.affiliationOrg
  editForm.irb = study.value.irb
  editForm.stage = study.value.stage
  editForm.accountCode = study.value.budget.accountCode ?? ''
  editForm.fundingName = study.value.budget.fundingName ?? ''
  editForm.baName = study.value.budget.baName ?? ''
  editForm.baEmail = study.value.budget.baEmail ?? ''
  editForm.contractingContact = study.value.budget.contractingContact ?? ''
  editForm.additionalNotes = study.value.additionalNotes ?? ''
  editForm.visits = (study.value.cohort.visits ?? []).map(v => ({ ...v }))
  editForm.cohortGroups = normalizeGroups(study.value.cohort.groups ?? [], editForm.visits)
  editForm.intakeDetails = JSON.parse(JSON.stringify(study.value.intakeDetails ?? {}))
  editForm.budgetLines = study.value.budget.lines.map(l => ({ ...l }))
  editForm.keyPersonnel = (study.value.keyPersonnel ?? []).map(p => ({ ...p }))
  newServiceId.value = ''
  editOpen.value = true
}

// The exact field payload sent to the API. Also fed to diffStudyDetails()
// for the pre-save preview, so the confirmation popup shows exactly what the
// PI will be emailed (server-side diff lives in update-study.post.ts).
function editedStudyFields() {
  const s = study.value!
  const lines = editForm.budgetLines.map(l => ({ ...l, planned: Math.max(0, l.planned || 0) }))
  return {
    name: editForm.name.trim(),
    abbreviation: editForm.abbreviation.trim(),
    pi: { name: editForm.piName.trim(), email: editForm.piEmail.trim() },
    studyLead: editForm.studyLeadName.trim()
      ? { name: editForm.studyLeadName.trim(), email: editForm.studyLeadEmail.trim() }
      : undefined,
    affiliation: editForm.affiliation,
    affiliationOrg: editForm.affiliationOrg.trim(),
    irb: editForm.irb.trim(),
    stage: editForm.stage,
    additionalNotes: editForm.additionalNotes.trim() || undefined,
    cohort: {
      ...s.cohort,
      subjects: editMatrixSubjects.value,
      totalSamples: editMatrixTotal.value,
      groups: normalizeGroups(editForm.cohortGroups, editForm.visits),
      visits: editForm.visits,
    },
    budget: {
      ...s.budget,
      lines,
      accountCode: editForm.affiliation === 'Internal' ? (editForm.accountCode.trim() || null) : null,
      fundingName: editForm.affiliation === 'Internal' ? (editForm.fundingName.trim() || null) : null,
      baName: editForm.affiliation === 'Internal' ? (editForm.baName.trim() || null) : null,
      baEmail: editForm.affiliation === 'Internal' ? (editForm.baEmail.trim() || null) : null,
      contractingContact: editForm.affiliation !== 'Internal' ? (editForm.contractingContact.trim() || null) : null,
    },
    intakeDetails: cleanIntakeDetails(editForm.intakeDetails),
    keyPersonnel: normalizePersonnel(editForm.keyPersonnel),
  }
}

// Short "Updated: name, IRB, …" line recorded on the study's activity log.
function editChangeNote(): string | undefined {
  const s = study.value!
  const changes: string[] = []
  if (editForm.name.trim() !== s.name) changes.push('name')
  if (editForm.abbreviation.trim() !== (s.abbreviation ?? '')) changes.push('abbreviation')
  if (editForm.affiliation !== s.affiliation) changes.push(`affiliation → ${editForm.affiliation}`)
  if (editForm.piName.trim() !== s.pi.name || editForm.piEmail.trim() !== s.pi.email) changes.push('PI')
  if (editForm.studyLeadName.trim() !== (s.studyLead?.name ?? '') || editForm.studyLeadEmail.trim() !== (s.studyLead?.email ?? '')) changes.push('study lead')
  if (editForm.irb.trim() !== (s.irb ?? '')) changes.push('IRB')
  if (editForm.additionalNotes.trim() !== (s.additionalNotes ?? '')) changes.push('additional notes')
  if (editMatrixSubjects.value !== s.cohort.subjects) changes.push('cohort')
  if (JSON.stringify(editForm.visits) !== JSON.stringify(s.cohort.visits ?? [])) changes.push('visit schedule')
  if ([...editForm.budgetLines].map(l => l.service).sort().join('|') !== [...(s.budget.lines || [])].map(l => l.service).sort().join('|')) changes.push('services')
  if (JSON.stringify(normalizePersonnel(editForm.keyPersonnel)) !== JSON.stringify(normalizePersonnel(s.keyPersonnel ?? []))) changes.push('key personnel')
  return changes.length > 0 ? `Updated: ${changes.join(', ')}` : undefined
}

// ── Save confirmation ──
// The study's agreement package was already emailed to the PI, so saving a
// change here also emails them the specifics. Preview that list and confirm
// before the write.
const saveConfirmOpen = ref(false)
const pendingChanges = ref<StudyChange[]>([])

const notifyRecipients = computed(() => {
  const names = [editForm.piName.trim() || study.value?.pi.name || 'the PI']
  if (editForm.studyLeadName.trim()) names.push(editForm.studyLeadName.trim())
  return names.join(' and ')
})

function previewStudyChanges(): StudyChange[] {
  if (!study.value) return []
  const s = study.value
  const f = editedStudyFields()
  const before: StudyDetailSnapshot = {
    name: s.name, abbreviation: s.abbreviation, pi: s.pi, studyLead: s.studyLead,
    affiliation: s.affiliation, affiliationOrg: s.affiliationOrg, irb: s.irb,
    additionalNotes: s.additionalNotes,
    cohort: {
      subjects: s.cohort.subjects, totalSamples: s.cohort.totalSamples,
      groups: s.cohort.groups ?? [], visits: s.cohort.visits ?? [],
    },
    budget: s.budget,
    intakeDetails: cleanIntakeDetails(s.intakeDetails ?? {}),
    keyPersonnel: normalizePersonnel(s.keyPersonnel ?? []),
  }
  const after: StudyDetailSnapshot = {
    name: f.name, abbreviation: f.abbreviation, pi: f.pi, studyLead: f.studyLead,
    affiliation: f.affiliation, affiliationOrg: f.affiliationOrg, irb: f.irb,
    additionalNotes: f.additionalNotes, cohort: f.cohort, budget: f.budget,
    intakeDetails: f.intakeDetails, keyPersonnel: f.keyPersonnel,
  }
  return diffStudyDetails(before, after)
}

function promptSave() {
  if (!study.value || !editForm.name.trim() || !hasChanges.value) return
  pendingChanges.value = previewStudyChanges()
  saveConfirmOpen.value = true
}

function changeText(c: StudyChange): string {
  return c.from !== undefined || c.to !== undefined ? `${c.from} → ${c.to}` : 'updated'
}

async function saveEdit() {
  if (!study.value) return
  isSaving.value = true
  try {
    const changeCount = pendingChanges.value.length
    const { notified } = await adminStore.updateStudy(study.value.id, editedStudyFields(), editChangeNote())
    saveConfirmOpen.value = false
    editOpen.value = false
    showToast(
      notified
        ? `Study updated — ${notifyRecipients.value} emailed about the ${changeCount === 1 ? 'change' : `${changeCount} changes`}.`
        : 'Study updated.',
    )
  }
  catch (err: unknown) {
    console.error('[saveEdit]', err)
    const e = err as Record<string, unknown>
    const msg = ((e?.data as Record<string, unknown>)?.statusMessage as string)
      || (e?.statusMessage as string)
      || (e?.message as string)
      || JSON.stringify(err)
    alert(`Failed to save: ${msg}`)
  }
  finally {
    isSaving.value = false
  }
}

// Lightweight success toast (bottom-right, auto-dismiss).
const toast = ref<string | null>(null)
let toastTimer: ReturnType<typeof setTimeout> | null = null
function showToast(msg: string) {
  toast.value = msg
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.value = null }, 5000)
}
onBeforeUnmount(() => { if (toastTimer) clearTimeout(toastTimer) })

const stageClass = computed(() => {
  if (!study.value) return ''
  if (study.value.stage === 'Complete') return 'b-complete'
  if (study.value.stage === 'Processing') return 'b-processing'
  if (study.value.stage === 'Awaiting Signature') return 'b-agreement'
  return 'b-review'
})

const affiliationClass = computed(() => {
  if (!study.value) return ''
  if (study.value.affiliation === 'Internal') return 'b-internal'
  if (study.value.affiliation === 'External') return 'b-external'
  return 'b-industry'
})
</script>

<template>
  <div v-if="study">
    <div class="crumbs">
      <NuxtLink to="/admin/studies" class="crumb-link">Studies</NuxtLink>
      <span class="sep">›</span>
      <span>{{ study.name }}</span>
    </div>

    <!-- Hero -->
    <div class="detail-hero">
      <div>
        <h2>
          {{ study.name }}
          <span class="acronym">{{ study.abbreviation }}</span>
          <span class="adm-badge" :class="affiliationClass">
            <span class="dot" /> Penn {{ study.affiliation }}
          </span>
          <span class="adm-badge" :class="stageClass">
            <span class="dot" /> {{ study.stage }}
          </span>
        </h2>
        <div class="pi-line">
          <strong>{{ study.pi.name }}</strong> · {{ study.affiliationOrg }} ·
          <span class="mono">{{ study.pi.email }}</span>
        </div>
        <div class="meta-strip">
          <div v-if="study.studyLead" class="meta-item">
            <span class="meta-label">Study lead</span>
            <span class="meta-val">{{ study.studyLead.name }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">IRB</span>
            <span class="meta-val">{{ study.irb }}</span>
          </div>
          <div v-if="study.startedDate" class="meta-item">
            <span class="meta-label">Started</span>
            <span class="meta-val">{{ study.startedDate }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Cohort</span>
            <span class="meta-val">{{ cohortScopeLabel }}</span>
          </div>
        </div>
      </div>
      <div class="hero-actions">
        <template v-if="study.isLocked">
          <div class="status-strip">
            <span class="dot" />
            <span class="txt">Agreements pending · {{ study.agreements.filter(a => a.status === 'Pending').length }} outstanding</span>
          </div>
        </template>
        <button class="btn btn-secondary btn-sm" style="width:100%" @click="openEdit">Edit ✎</button>
        <button class="btn btn-danger btn-sm" style="width:100%" @click="deleteOpen = true">Delete ✕</button>
        <button class="btn btn-ghost btn-sm" style="width:100%;font-size:0.78rem;" @click="regenerateOpen = true">
          {{ regenerateCopied ? 'Link copied ✓' : 'Regenerate PI status link' }}
        </button>
      </div>
    </div>

    <!-- Locked banner -->
    <div v-if="study.isLocked" class="locked-banner">
      <div class="lock-icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </div>
      <div class="lock-body">
        <h4>Sample processing locked until all agreements are signed</h4>
        <p>
          <span class="frac">{{ signedCount }} of {{ study.agreements.length }}</span>
          agreements countersigned. The
          {{ study.agreements.find(a => a.status === 'Pending')?.name }}
          is still awaiting {{ study.pi.name }}'s signature.
          Study activation, sample drop-off, and processing are blocked until then.
          To resend a signing link, open the Agreements tab and click <strong>Resend secure link</strong> on the relevant agreement.
        </p>
      </div>
      <div class="lock-actions">
        <button class="btn btn-primary btn-sm" @click="openAgreementsTab">Open agreements →</button>
      </div>
    </div>

    <!-- Lifecycle -->
    <div class="lifecycle-section">
      <div class="lifecycle-head">
        <h3>Lifecycle</h3>
        <button v-if="study.stage === 'Processing'" class="btn btn-success-outline btn-sm lifecycle-stage-btn" @click="stageConfirmTarget = 'Complete'">
          Mark Complete ✓
        </button>
        <button v-else-if="study.stage === 'Complete'" class="btn btn-ghost btn-sm lifecycle-stage-btn" @click="stageConfirmTarget = 'Processing'">
          Reopen study ↺
        </button>
      </div>
      <div class="sub">From intake to data delivery — every step time-stamped by the platform.</div>
      <div class="life-timeline">
        <div
          v-for="step in study.lifecycle"
          :key="step.label"
          class="life-step"
          :class="step.status"
        >
          <div class="life-dot" />
          <div class="life-label">{{ step.label }}</div>
          <div class="life-when">{{ step.date }}</div>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <button class="tab-btn" :class="{ active: activeTab === 'overview' }" @click="activeTab = 'overview'">Overview</button>
      <button class="tab-btn" :class="{ active: activeTab === 'agreements' }" @click="activeTab = 'agreements'">
        Agreements
        <span class="tab-count">{{ signedCount }}/{{ study.agreements.length }}</span>
      </button>
      <button class="tab-btn" :class="{ active: activeTab === 'cohort' }" @click="activeTab = 'cohort'">
        Cohort &amp; samples
        <span v-if="study.isLocked" class="tab-count" style="background:rgba(183,149,11,0.12); color:var(--gold)">Locked</span>
      </button>
      <button class="tab-btn" :class="{ active: activeTab === 'budget' }" @click="activeTab = 'budget'">Budget</button>
      <button class="tab-btn" :class="{ active: activeTab === 'notes' }" @click="activeTab = 'notes'">Notes &amp; activity</button>
    </div>

    <!-- OVERVIEW -->
    <div v-if="activeTab === 'overview'">
      <div class="panel">
        <div class="panel-head"><h3>Study summary</h3></div>
        <div class="study-info-grid">
          <template v-if="study.additionalNotes">
            <div class="info-lbl">Additional notes</div>
            <div>{{ study.additionalNotes }}</div>
          </template>

          <div class="info-lbl">PI / Lead</div>
          <div>
            {{ study.pi.name }} (PI)
            <template v-if="study.studyLead"> · {{ study.studyLead.name }} (lead) · <span class="mono">{{ study.studyLead.email }}</span></template>
          </div>

          <template v-if="keyPersonnel.length">
            <div class="info-lbl">Key personnel</div>
            <div>
              <table class="sched-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Email</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(p, i) in keyPersonnel" :key="i">
                    <td>{{ p.name || '—' }}</td>
                    <td>{{ p.role || '—' }}</td>
                    <td class="mono">{{ p.email || '—' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>

          <template v-if="study.budget.fundingName || study.budget.baName">
            <div class="info-lbl">Funding / billing</div>
            <div>
              <div v-if="study.budget.fundingName">{{ study.budget.fundingName }}</div>
              <div v-if="study.budget.baName">{{ study.budget.baName }}<template v-if="study.budget.baEmail"> · <span class="mono">{{ study.budget.baEmail }}</span></template></div>
            </div>
          </template>

          <template v-if="study.budget.contractingContact">
            <div class="info-lbl">Contracting contact</div>
            <div>{{ study.budget.contractingContact }}</div>
          </template>

          <div v-if="study.department" class="info-lbl">Department</div>
          <div v-if="study.department">{{ study.department }}</div>

          <div class="info-lbl">Services</div>
          <div>
            <div v-for="line in study.budget.lines" :key="line.service">
              {{ line.service }} · <span class="mono">${{ line.rate }} × {{ line.planned }}</span>
            </div>
          </div>

          <template v-if="visits.length">
            <div class="info-lbl">Visit schedule</div>
            <div>
              <table class="sched-table">
                <thead>
                  <tr>
                    <th>Visit</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="v in visits" :key="v.id">
                    <td>{{ v.label || '—' }}</td>
                    <td>{{ v.description || '—' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>

          <template v-if="cohortGroups.length">
            <div class="info-lbl">Cohort sample matrix</div>
            <div>
              <table class="sched-table">
                <thead>
                  <tr>
                    <th>Cohort</th>
                    <th>Subs</th>
                    <th v-for="v in visits" :key="v.id">{{ v.label }}</th>
                    <th>Samples</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(g, i) in cohortGroups" :key="i">
                    <td>{{ g.name || '—' }}<template v-if="g.description"> — {{ g.description }}</template></td>
                    <td class="mono">{{ g.subjects }}</td>
                    <td v-for="v in visits" :key="v.id" class="mono">{{ g.samples?.[v.id] || 0 }}</td>
                    <td class="mono">{{ groupTotal(g, visits).toLocaleString() }}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr>
                    <td>Total</td>
                    <td class="mono">{{ cohortGroups.reduce((s, g) => s + (Number(g.subjects) || 0), 0).toLocaleString() }}</td>
                    <td v-for="v in visits" :key="v.id" class="mono">
                      {{ cohortGroups.reduce((s, g) => s + (Number(g.subjects) || 0) * (Number(g.samples?.[v.id]) || 0), 0).toLocaleString() }}
                    </td>
                    <td class="mono">{{ matrixGrandTotal.toLocaleString() }}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </template>

          <template v-for="row in detailRows" :key="row.label">
            <div class="info-lbl">{{ row.label }}</div>
            <div>{{ row.value }}</div>
          </template>
        </div>
      </div>
    </div>

    <!-- AGREEMENTS -->
    <div v-if="activeTab === 'agreements'">
      <div class="panel">
        <div class="panel-head">
          <h3>Agreement package</h3>
          <span class="ctx">{{ signedCount }} of {{ study.agreements.length }} signed · secured link via email</span>
        </div>

        <div v-for="agreement in study.agreements" :key="agreement.id" class="agree-item" :class="{ 'pending-bg': agreement.status === 'Pending' }">
          <div class="agree-check" :class="agreement.status === 'Signed' ? 'signed' : 'pending'">
            {{ agreement.status === 'Signed' ? '✓' : '!' }}
          </div>
          <div>
            <div class="agree-name">{{ agreement.name }}</div>
            <div class="agree-desc">{{ agreement.description }}</div>
          </div>

          <template v-if="agreement.status === 'Signed'">
            <div class="sig-stamp">
              <div class="sig-name">{{ agreement.signedBy }}</div>
              <div class="sig-meta">Digitally signed {{ agreement.signedDate }}</div>
              <div class="sig-verified">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 2 4 5v6c0 5 3.5 9.5 8 11 4.5-1.5 8-6 8-11V5l-8-3z" />
                  <polyline points="9 12 11 14 15 10" />
                </svg>
                Verified: {{ agreement.signedBy }} ({{ agreement.signedEmail }})
              </div>
            </div>
            <NuxtLink :to="'/admin/sign/' + study.id + '-' + agreement.id" class="btn btn-ghost btn-sm">View document</NuxtLink>
          </template>

          <template v-else>
            <div class="sig-pending">
              <span class="sig-pend-ttl">⌛ Awaiting PI signature</span>
              <span class="sig-pend-sub">Secure sign link sent {{ agreement.sentDate }}<template v-if="agreement.reminderDate"> · reminder {{ agreement.reminderDate }}</template></span>
            </div>
            <div style="display:flex; flex-direction:column; gap:0.4rem; align-items:flex-end;">
              <NuxtLink :to="'/admin/sign/' + study.id + '-' + agreement.id" class="btn btn-primary btn-sm">
                Preview PI sign view →
              </NuxtLink>
              <button
                class="btn btn-ghost btn-sm"
                :disabled="sendingLink === study.id + '-' + agreement.id"
                @click="sendSignLink(study.id, agreement.id)"
              >
                {{ sentLink.has(study.id + '-' + agreement.id) ? '✓ Link sent' : sendingLink === study.id + '-' + agreement.id ? 'Sending…' : 'Resend secure link' }}
              </button>
            </div>
          </template>
        </div>

      </div>

      <!-- Document history -->
      <div class="panel" style="margin-top:1.2rem;">
        <div class="panel-head"><h3>Document history</h3></div>
        <div class="activity-timeline">
          <div v-for="(item, i) in study.activity.slice(0, 5)" :key="i" class="t-item">
            <div class="t-dot" :class="item.dotClass" />
            <div class="t-body">
              <div class="t-title">{{ item.title }}</div>
              <div class="t-meta">{{ item.date }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- COHORT -->
    <div v-if="activeTab === 'cohort'">
      <div v-if="study.isLocked" class="locked-empty">
        <div class="ico-big">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <h3>Cohort &amp; sample tracking unlocks at activation</h3>
        <p>
          Sample drop-off, processing events, QC, and the per-sample table all become available
          once the full agreement package is countersigned and a LabVantage study ID is assigned.
          <strong style="color:var(--ink)">{{ signedCount }} of {{ study.agreements.length }} agreements</strong> are complete.
        </p>
        <div style="display:flex; gap:0.6rem; justify-content:center;">
          <button class="btn btn-secondary btn-sm" @click="activeTab = 'agreements'">Open agreements</button>
        </div>

        <div style="margin-top:1.8rem; padding-top:1.4rem; border-top:1px solid rgba(0,0,0,0.06); max-width:520px; margin-left:auto; margin-right:auto;">
          <div style="font-size:0.66rem; text-transform:uppercase; letter-spacing:0.1em; color:var(--muted); font-weight:600; margin-bottom:0.6rem">Planned scope at activation</div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.8rem; text-align:left;">
            <div style="padding:0.7rem 0.9rem; background:var(--cream); border-radius:var(--radius);">
              <div style="font-size:0.62rem; text-transform:uppercase; letter-spacing:0.1em; color:var(--muted); font-weight:600">Subjects</div>
              <div class="mono" style="font-size:1.1rem; font-weight:500">{{ study.cohort.subjects }}</div>
            </div>
            <div style="padding:0.7rem 0.9rem; background:var(--cream); border-radius:var(--radius);">
              <div style="font-size:0.62rem; text-transform:uppercase; letter-spacing:0.1em; color:var(--muted); font-weight:600">Cohorts</div>
              <div class="mono" style="font-size:1.1rem; font-weight:500">{{ cohortGroups.length }}</div>
            </div>
            <div style="padding:0.7rem 0.9rem; background:var(--cream); border-radius:var(--radius);">
              <div style="font-size:0.62rem; text-transform:uppercase; letter-spacing:0.1em; color:var(--muted); font-weight:600">Total samples</div>
              <div class="mono" style="font-size:1.1rem; font-weight:500">{{ study.cohort.totalSamples }}</div>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="panel">
        <div class="panel-head">
          <h3>Cohort progress</h3>
          <span class="ctx">{{ study.cohort.processedSamples }} / {{ study.cohort.totalSamples }} samples processed</span>
        </div>
        <div class="study-info-grid" style="padding:1.2rem 1.4rem;">
          <div class="info-lbl">Subjects</div>
          <div>{{ study.cohort.subjects }}</div>
          <div class="info-lbl">Cohorts</div>
          <div>{{ cohortGroups.length }}</div>
          <div class="info-lbl">Total samples</div>
          <div>{{ study.cohort.totalSamples }}</div>
          <div class="info-lbl">Processed</div>
          <div>
            <div v-if="!editingSamples" style="display:flex; align-items:center; gap:0.8rem;">
              <span class="mono" style="font-size:1rem; font-weight:500;">{{ study.cohort.processedSamples }}</span>
              <div class="prog-bar" style="width:160px; flex-shrink:0;">
                <div :style="{ width: (study.cohort.processedSamples / study.cohort.totalSamples * 100) + '%' }" />
              </div>
              <button class="btn btn-ghost btn-sm" @click="startEditSamples">Edit</button>
            </div>
            <div v-else style="display:flex; align-items:center; gap:0.6rem;">
              <input
                v-model.number="samplesInput"
                type="number"
                min="0"
                :max="study.cohort.totalSamples"
                style="width:90px;"
                @keydown.enter="saveSamples"
                @keydown.escape="editingSamples = false"
              >
              <span style="font-size:0.82rem; color:var(--muted)">of {{ study.cohort.totalSamples }}</span>
              <button class="btn btn-primary btn-sm" :disabled="isSavingSamples" @click="saveSamples">
                {{ isSavingSamples ? 'Saving…' : 'Save' }}
              </button>
              <button class="btn btn-ghost btn-sm" :disabled="isSavingSamples" @click="editingSamples = false">Cancel</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- BUDGET -->
    <div v-if="activeTab === 'budget'">
      <div class="panel">
        <div class="panel-head">
          <h3>Budget</h3>
          <span v-if="study.budget.accountCode" class="ctx">Account: {{ study.budget.accountCode }} · billed via iLabs</span>
        </div>

        <table class="budget-table">
          <thead>
            <tr>
              <th>Service</th>
              <th>Rate</th>
              <th>Planned</th>
              <th>Est. total</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="line in study.budget.lines" :key="line.service">
              <td>{{ line.service }}</td>
              <td class="mono">${{ line.rate }}</td>
              <td class="mono">{{ line.planned }}</td>
              <td class="mono">${{ (line.rate * line.planned).toLocaleString() }}</td>
            </tr>
            <tr style="background:rgba(0,0,0,0.02)">
              <td colspan="3" style="text-align:right; font-weight:600">Estimated total</td>
              <td class="mono" style="font-weight:600; color:var(--accent)">${{ budgetEstimatedTotal.toLocaleString() }}</td>
            </tr>
          </tbody>
        </table>

      </div>
    </div>

    <!-- NOTES & ACTIVITY -->
    <div v-if="activeTab === 'notes'">
      <div class="panel">
        <div class="panel-head">
          <h3>Notes &amp; activity</h3>
          <span class="ctx">Combined audit log · internal staff only</span>
        </div>
        <div class="activity-timeline" style="max-height:340px; overflow-y:auto;">
          <div v-for="(item, i) in study.activity" :key="i" class="t-item">
            <div class="t-dot" :class="item.dotClass" />
            <div class="t-body">
              <div class="t-title">{{ item.title }}</div>
              <div class="t-meta">{{ item.date }}</div>
              <div v-if="item.note" class="t-note">{{ item.note }}</div>
            </div>
          </div>
        </div>
        <div class="note-composer">
          <textarea v-model="noteText" placeholder="Add an internal note (visible only to I3H staff)…" />
          <div class="composer-actions">
            <button class="btn btn-secondary btn-sm" :disabled="isPostingNote" @click="noteText = ''">Cancel</button>
            <button class="btn btn-primary btn-sm" :disabled="isPostingNote || !noteText.trim()" @click="postNote">
              {{ isPostingNote ? 'Posting…' : 'Post note' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Regenerate PI status link modal -->
  <div v-if="regenerateOpen" class="clerk-overlay" @click.self="regenerateOpen = false">
    <div class="edit-modal">
      <div class="em-head">
        <h3>Regenerate PI status link</h3>
      </div>
      <div class="em-body">
        <p style="margin:0 0 0.75rem; font-size:0.88rem;">
          This will invalidate the PI's current status link, generate a new one, email it to the PI, and copy it to your clipboard.
        </p>
        <p style="margin:0; font-size:0.82rem; color:var(--muted);">
          Use this if the PI's email address changed, or if the link was accidentally shared with someone it shouldn't have been.
        </p>
      </div>
      <div class="em-foot">
        <button class="btn btn-ghost btn-sm" :disabled="isRegenerating" @click="regenerateOpen = false">Cancel</button>
        <button class="btn btn-secondary btn-sm" :disabled="isRegenerating" @click="regenerateStatusLink">
          {{ isRegenerating ? 'Regenerating…' : 'Regenerate & copy link' }}
        </button>
      </div>
    </div>
  </div>

  <!-- Delete confirmation modal -->
  <div v-if="deleteOpen" class="clerk-overlay" @click.self="deleteOpen = false">
    <div class="edit-modal">
      <div class="em-head">
        <h3>Delete study record</h3>
      </div>
      <div class="em-body">
        <p style="margin:0 0 0.4rem; font-size:0.88rem;">
          Are you sure you want to permanently delete <strong>{{ study.name }}</strong>?
        </p>
        <p style="margin:0; font-size:0.82rem; color:var(--muted);">
          This will remove the study and all associated agreements. This action cannot be undone.
        </p>
      </div>
      <div class="em-foot">
        <button class="btn btn-ghost btn-sm" :disabled="isDeleting" @click="deleteOpen = false">Cancel</button>
        <button class="btn btn-danger btn-sm" :disabled="isDeleting" @click="confirmDelete">
          {{ isDeleting ? 'Deleting…' : 'Delete study' }}
        </button>
      </div>
    </div>
  </div>

  <!-- Stage change confirmation modal -->
  <div v-if="stageConfirmTarget" class="clerk-overlay" @click.self="stageConfirmTarget = null">
    <div class="edit-modal">
      <div class="em-head">
        <h3>{{ stageConfirmTarget === 'Complete' ? 'Mark study Complete' : 'Reopen study' }}</h3>
      </div>
      <div class="em-body">
        <p v-if="stageConfirmTarget === 'Complete'" style="margin:0; font-size:0.88rem;">
          Are you sure you want to mark <strong>{{ study?.name }}</strong> as Complete?
        </p>
        <p v-else style="margin:0; font-size:0.88rem;">
          Are you sure you want to reopen <strong>{{ study?.name }}</strong>? This moves it back to Processing.
        </p>
      </div>
      <div class="em-foot">
        <button class="btn btn-ghost btn-sm" :disabled="isSavingStage" @click="stageConfirmTarget = null">Cancel</button>
        <button class="btn btn-sm" :class="stageConfirmTarget === 'Complete' ? 'btn-success-outline' : 'btn-primary'" :disabled="isSavingStage" @click="confirmStageChange">
          {{ isSavingStage ? 'Saving…' : (stageConfirmTarget === 'Complete' ? 'Mark Complete' : 'Reopen study') }}
        </button>
      </div>
    </div>
  </div>

  <!-- Edit study modal -->
  <div v-if="editOpen" class="clerk-overlay" @click.self="editOpen = false">
    <div class="edit-modal edit-modal-wide">
      <div class="em-head">
        <h3>Edit study record</h3>
      </div>
      <div class="em-body em-body-scroll">
        <!-- Study info -->
        <div class="em-section">
          <div class="em-section-title">Study info</div>
          <div class="em-grid">
            <div class="em-field em-full">
              <label class="em-label">Study name *</label>
              <input v-model="editForm.name" type="text" autofocus @keydown.escape="editOpen = false">
            </div>
            <div class="em-field em-full synopsis-field">
              <IntakeFields :fields="INTAKE_FIELDS.filter(f => f.key === 'studySynopsis')" :model="editForm.intakeDetails" variant="modal" show-all />
            </div>
            <div class="em-field">
              <label class="em-label">Project Acronym / ID</label>
              <div class="em-hint">Must be limited to 20 characters for LIMS</div>
              <input v-model="editForm.abbreviation" type="text" maxlength="20">
            </div>
            <div class="em-field-pair">
              <div class="em-field">
                <label class="em-label">Principal investigator</label>
                <input v-model="editForm.piName" type="text">
              </div>
              <div class="em-field">
                <label class="em-label">PI email</label>
                <input v-model="editForm.piEmail" type="email">
              </div>
            </div>
            <div class="em-field-pair">
              <div class="em-field">
                <label class="em-label">Point of contact / Project lead</label>
                <input v-model="editForm.studyLeadName" type="text">
              </div>
              <div class="em-field">
                <label class="em-label">Lead email</label>
                <input v-model="editForm.studyLeadEmail" type="email">
              </div>
            </div>
          </div>

          <div class="em-field em-full" style="margin-top:0.9rem;">
            <label class="em-label">Key Personnel</label>
            <div class="em-hint" style="margin-bottom:0.6rem;">CRCs, other physicians, etc. who'll help launch the study on the clinician's side</div>
            <div style="overflow-x:auto;">
              <table class="em-matrix">
                <thead>
                  <tr>
                    <th style="text-align:left;">Name</th>
                    <th style="text-align:left;">Role</th>
                    <th style="text-align:left;">Email</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(p, i) in editForm.keyPersonnel" :key="i">
                    <td><input v-model="p.name" type="text" placeholder="Full name"></td>
                    <td><input v-model="p.role" type="text" placeholder="e.g. CRC"></td>
                    <td><input v-model="p.email" type="email" placeholder="name@pennmedicine.upenn.edu"></td>
                    <td><button class="em-srv-remove" type="button" @click="removeEditPerson(i)">✕</button></td>
                  </tr>
                  <tr v-if="!editForm.keyPersonnel.length">
                    <td colspan="4" class="em-srv-empty">No key personnel added yet.</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="em-matrix-foot">
              <button class="btn btn-ghost btn-sm" type="button" @click="addEditPerson">+ Add another person</button>
            </div>
          </div>

          <div class="em-field em-full" style="margin-top:0.9rem;">
            <IntakeFields :fields="INTAKE_FIELDS.filter(f => f.key === 'collectionSites')" :model="editForm.intakeDetails" variant="modal" show-all />
          </div>
        </div>

        <!-- Defining Groups -->
        <div class="em-section">
          <div class="em-section-title">Defining Groups</div>
          <div class="em-section-hint">The cohorts/groups being studied — these drive the rows in the cohort sample matrix below</div>
          <div style="overflow-x:auto;">
            <table class="em-matrix">
              <thead>
                <tr>
                  <th style="text-align:left;">Group</th>
                  <th style="text-align:left;">Description</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                <tr v-for="(g, i) in editForm.cohortGroups" :key="i">
                  <td><input v-model="g.name" type="text" placeholder="Cohort name"></td>
                  <td><input v-model="g.description" type="text" placeholder="e.g. MS patients receiving anti-CD20"></td>
                  <td><button class="em-srv-remove" type="button" @click="removeEditGroup(i)">✕</button></td>
                </tr>
                <tr v-if="!editForm.cohortGroups.length">
                  <td colspan="3" class="em-srv-empty">No groups defined yet.</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="em-matrix-foot">
            <button class="btn btn-ghost btn-sm" type="button" @click="addEditGroup">+ Add another group</button>
          </div>
        </div>

        <!-- Defining Visits -->
        <div class="em-section">
          <div class="em-section-title">Defining Visits</div>
          <div class="em-section-hint">The timepoints/visits at which samples are collected — these drive the columns in the cohort sample matrix below</div>
          <div style="overflow-x:auto;">
            <table class="em-matrix">
              <thead>
                <tr>
                  <th style="text-align:left;">Visit</th>
                  <th style="text-align:left;">Description</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                <tr v-for="(v, i) in editForm.visits" :key="v.id">
                  <td><input v-model="v.label" type="text" placeholder="e.g. V1"></td>
                  <td><input v-model="v.description" type="text" placeholder="e.g. before treatment"></td>
                  <td><button class="em-srv-remove" type="button" @click="removeEditVisit(i)">✕</button></td>
                </tr>
                <tr v-if="!editForm.visits.length">
                  <td colspan="3" class="em-srv-empty">No visits defined yet.</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="em-matrix-foot">
            <button class="btn btn-ghost btn-sm" type="button" @click="addEditVisit">+ Add another visit</button>
          </div>
        </div>

        <!-- Cohort sample matrix -->
        <div class="em-section">
          <div class="em-section-title">Cohort sample matrix</div>
          <div style="overflow-x:auto;">
            <table class="em-matrix">
              <thead>
                <tr>
                  <th style="text-align:left;">Cohort / Group</th>
                  <th>Subjects</th>
                  <th v-for="v in editForm.visits" :key="v.id">{{ v.label || '—' }}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                <tr v-for="(g, i) in editForm.cohortGroups" :key="i">
                  <td style="text-align:left;">{{ g.name || 'Untitled group' }}</td>
                  <td><input v-model.number="g.subjects" type="number" min="0"></td>
                  <td v-for="v in editForm.visits" :key="v.id">
                    <input v-model.number="g.samples[v.id]" type="number" min="0">
                  </td>
                  <td><button class="em-srv-remove" type="button" @click="removeEditGroup(i)">✕</button></td>
                </tr>
                <tr v-if="!editForm.cohortGroups.length">
                  <td :colspan="editForm.visits.length + 3" class="em-srv-empty">No cohorts yet.</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="em-matrix-foot">
            <span class="em-matrix-total">{{ editMatrixSubjects.toLocaleString() }} subjects · {{ editMatrixTotal.toLocaleString() }} samples</span>
          </div>
        </div>

        <!-- Services -->
        <div class="em-section">
          <div class="em-section-title">Services</div>
          <div class="em-service-lines">
            <div v-for="(line, i) in editForm.budgetLines" :key="i" class="em-service-row">
              <span class="em-srv-name">{{ line.service }}</span>
              <span class="em-srv-rate">${{ line.rate }}/ea</span>
              <input
                v-model.number="editForm.budgetLines[i].planned"
                type="number"
                min="0"
                style="width:72px;"
              >
              <span class="em-srv-committed">${{ (line.rate * Math.max(0, editForm.budgetLines[i].planned || 0)).toLocaleString() }}</span>
              <button class="em-srv-remove" type="button" @click="removeServiceLine(i)">✕</button>
            </div>
            <div v-if="editForm.budgetLines.length === 0" class="em-srv-empty" style="padding-bottom:0;">No services added yet.</div>
          </div>
          <select
            v-if="availableToAdd.length > 0"
            v-model="newServiceId"
            style="width:50%; margin-top:0.9rem;"
            @change="addServiceLine"
          >
            <option value="">+ Add service…</option>
            <option v-for="svc in availableToAdd" :key="svc.id" :value="svc.id">{{ svc.name }}</option>
          </select>
          <div class="em-field em-full" style="margin-top:0.9rem;">
            <label class="em-label">Additional notes or questions</label>
            <textarea v-model="editForm.additionalNotes" rows="3" placeholder="Anything else the I3H team should know or follow up on" />
          </div>
        </div>

        <!-- Regulatory -->
        <div class="em-section">
          <div class="em-section-title">Regulatory</div>
          <div class="em-field" style="margin-bottom:0.9rem;">
            <label class="em-label">IRB Number</label>
            <input v-model="editForm.irb" type="text" style="width:50%;">
          </div>
          <IntakeFields :fields="(fieldsBySection.find(g => g.section === 'Regulatory')?.fields ?? []).filter(f => f.key === 'irbStatus')" :model="editForm.intakeDetails" variant="modal" show-all />
        </div>

        <!-- Blood Collection -->
        <div class="em-section">
          <div class="em-section-title">Blood Collection</div>
          <IntakeFields :fields="bloodCollectionFields" :model="editForm.intakeDetails" variant="modal" show-all />
        </div>

        <!-- Logistics -->
        <div class="em-section">
          <div class="em-section-title">Logistics</div>
          <IntakeFields :fields="fieldsBySection.find(g => g.section === 'Scope')?.fields ?? []" :model="editForm.intakeDetails" variant="modal" show-all />
        </div>

        <!-- Billing -->
        <div class="em-section">
          <div class="em-section-title">Billing</div>
          <div class="em-grid">
            <div class="em-field">
              <label class="em-label">Affiliation</label>
              <select v-model="editForm.affiliation">
                <option>Internal</option>
                <option>External</option>
                <option>Industry</option>
              </select>
            </div>
            <div v-if="editForm.affiliation === 'Internal'" class="em-field">
              <label class="em-label">Budget account number</label>
              <input v-model="editForm.accountCode" type="text" placeholder="400-____-_-______-____-____-____">
            </div>
            <div v-else class="em-field">
              <label class="em-label">Institution</label>
              <input v-model="editForm.affiliationOrg" type="text">
            </div>
            <div v-if="editForm.affiliation !== 'Internal'" class="em-field">
              <label class="em-label">Contracting / grants office contact</label>
              <input v-model="editForm.contractingContact" type="email" placeholder="contracts@institution.edu">
            </div>
            <template v-if="editForm.affiliation === 'Internal'">
              <div class="em-field em-full">
                <label class="em-label">Funding source name (in CAMS)</label>
                <input v-model="editForm.fundingName" type="text" placeholder="Project title as listed in CAMS">
              </div>
              <div class="em-field">
                <label class="em-label">Business administrator name</label>
                <input v-model="editForm.baName" type="text">
              </div>
              <div class="em-field">
                <label class="em-label">BA contact email</label>
                <input v-model="editForm.baEmail" type="email">
              </div>
            </template>
          </div>
        </div>
      </div>
      <div class="em-foot">
        <button class="btn btn-ghost btn-sm" :disabled="isSaving" @click="editOpen = false">Cancel</button>
        <button class="btn btn-primary btn-sm" :disabled="isSaving || !editForm.name.trim() || !hasChanges" @click="promptSave">
          Save changes
        </button>
      </div>
    </div>
  </div>

  <!-- Save confirmation — the PI already has the agreement package, so any
       study-record change emails them the specifics. -->
  <div v-if="saveConfirmOpen" class="clerk-overlay" @click.self="saveConfirmOpen = false">
    <div class="edit-modal">
      <div class="em-head">
        <h3>Save changes &amp; notify the PI?</h3>
      </div>
      <div class="em-body">
        <template v-if="pendingChanges.length">
          <p style="margin:0 0 0.75rem; font-size:0.88rem;">
            {{ notifyRecipients }} will be emailed that the following
            {{ pendingChanges.length === 1 ? 'value has' : 'values have' }} changed,
            with a link to the study status page:
          </p>
          <ul class="save-confirm-list">
            <li v-for="c in pendingChanges" :key="c.label">
              <span class="scl-label">{{ c.label }}</span>
              <span class="scl-detail">{{ changeText(c) }}</span>
            </li>
          </ul>
        </template>
        <p v-else style="margin:0; font-size:0.88rem;">
          No PI-facing values changed, so no notification email will be sent. Save anyway?
        </p>
      </div>
      <div class="em-foot">
        <button class="btn btn-ghost btn-sm" :disabled="isSaving" @click="saveConfirmOpen = false">Go back</button>
        <button class="btn btn-primary btn-sm" :disabled="isSaving" @click="saveEdit">
          {{ isSaving ? 'Saving…' : (pendingChanges.length ? 'Save & send email' : 'Save') }}
        </button>
      </div>
    </div>
  </div>

  <!-- Success toast -->
  <div v-if="toast" class="save-toast" role="status">{{ toast }}</div>
</template>

<style scoped>
.save-confirm-list {
  margin: 0;
  padding: 0;
  list-style: none;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 6px;
  overflow: hidden;
  max-height: 260px;
  overflow-y: auto;
}
.save-confirm-list li {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.83rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}
.save-confirm-list li:last-child {
  border-bottom: none;
}
.scl-label {
  font-weight: 600;
  color: #011F5B;
  white-space: nowrap;
}
.scl-detail {
  color: #555;
  text-align: right;
  word-break: break-word;
}

.save-toast {
  position: fixed;
  right: 1.5rem;
  bottom: 1.5rem;
  z-index: 100;
  max-width: 380px;
  background: #011F5B;
  color: #fff;
  padding: 0.85rem 1.15rem;
  border-radius: 8px;
  font-size: 0.86rem;
  line-height: 1.45;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.22);
  animation: save-toast-in 0.25s ease;
}
@keyframes save-toast-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
