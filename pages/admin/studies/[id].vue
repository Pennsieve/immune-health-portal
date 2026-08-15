<script setup lang="ts">
import { useAdminStore } from '~/stores/admin'
import type { Affiliation, StudyStage } from '~/stores/admin'
import { useServicesStore } from '~/stores/services'
import { COLLECTION_TIMEPOINTS } from '~/types/index'
import { INTAKE_FIELDS, INTAKE_SECTIONS, intakeDetailRows, cleanIntakeDetails } from '~/utils/intakeFields'

definePageMeta({ layout: 'admin' })

const route = useRoute()
const adminStore = useAdminStore()

const study = computed(() => adminStore.studies.find(s => s.id === route.params.id))

// Cohort sample matrix (read-only display on the overview)
const TIMEPOINTS = COLLECTION_TIMEPOINTS
type CohortGroup = { name: string; subjects: number; samples: Record<string, number> }
const cohortGroups = computed<CohortGroup[]>(() => study.value?.cohort.groups ?? [])
const groupTotal = (g: CohortGroup) =>
  (Number(g.subjects) || 0) * TIMEPOINTS.reduce((s, tp) => s + (Number(g.samples?.[tp.key]) || 0), 0)
const matrixGrandTotal = computed(() =>
  cohortGroups.value.reduce((s, g) => s + groupTotal(g), 0),
)
// Read-only rows for the expanded intake answers (schema-driven)
const detailRows = computed(() => intakeDetailRows(study.value?.intakeDetails))
const fieldsBySection = INTAKE_SECTIONS.map(section => ({
  section,
  fields: INTAKE_FIELDS.filter(f => f.section === section),
}))

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
  if (editForm.stage !== s.stage) return true
  if (editForm.affiliation !== s.affiliation) return true
  if (editForm.piName.trim() !== s.pi.name || editForm.piEmail.trim() !== s.pi.email) return true
  if (editForm.studyLeadName.trim() !== (s.studyLead?.name ?? '') || editForm.studyLeadEmail.trim() !== (s.studyLead?.email ?? '')) return true
  if (editForm.irb.trim() !== (s.irb ?? '')) return true
  if (editForm.objectives.trim() !== (s.objectives ?? '')) return true
  if (editForm.phlebotomy !== (s.phlebotomy ?? '')) return true
  if (editForm.metadata !== (s.metadata ?? '')) return true
  if (editForm.cohortSampleType.trim() !== (s.cohort.sampleType ?? '')) return true
  if (JSON.stringify(normalizeGroups(editForm.cohortGroups)) !== JSON.stringify(normalizeGroups(s.cohort.groups ?? []))) return true
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
  return false
})

type BudgetLine = { service: string; rate: number; planned: number; completed: number; committed: number; invoiced: number }

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
  objectives: '',
  phlebotomy: '',
  metadata: '',
  cohortSampleType: '',
  cohortGroups: [] as CohortGroup[],
  budgetLines: [] as BudgetLine[],
  intakeDetails: {} as Record<string, unknown>,
})

function normalizeGroups(groups: CohortGroup[]): CohortGroup[] {
  return groups.map(g => ({
    name: g.name || '',
    subjects: Number(g.subjects) || 0,
    samples: Object.fromEntries(TIMEPOINTS.map(tp => [tp.key, Number(g.samples?.[tp.key]) || 0])),
  }))
}
function addEditGroup() {
  editForm.cohortGroups.push({ name: '', subjects: 0, samples: Object.fromEntries(TIMEPOINTS.map(tp => [tp.key, 0])) })
}
function removeEditGroup(i: number) {
  editForm.cohortGroups.splice(i, 1)
}
// Cohort scope derived from the edited matrix
const editMatrixSubjects = computed(() =>
  editForm.cohortGroups.reduce((s, g) => s + (Number(g.subjects) || 0), 0),
)
const editMatrixTotal = computed(() =>
  editForm.cohortGroups.reduce(
    (s, g) => s + (Number(g.subjects) || 0) * TIMEPOINTS.reduce((a, tp) => a + (Number(g.samples?.[tp.key]) || 0), 0),
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
  editForm.budgetLines.push({ service: svc.name, rate, planned: 1, completed: 0, committed: rate, invoiced: 0 })
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
  editForm.objectives = study.value.objectives ?? ''
  editForm.phlebotomy = study.value.phlebotomy ?? ''
  editForm.metadata = study.value.metadata ?? ''
  editForm.cohortSampleType = study.value.cohort.sampleType
  editForm.cohortGroups = normalizeGroups(study.value.cohort.groups ?? [])
  editForm.intakeDetails = JSON.parse(JSON.stringify(study.value.intakeDetails ?? {}))
  editForm.budgetLines = study.value.budget.lines.map(l => ({ ...l }))
  newServiceId.value = ''
  editOpen.value = true
}

async function saveEdit() {
  if (!study.value || !editForm.name.trim()) return
  isSaving.value = true
  try {
    const subjects = editMatrixSubjects.value
    const totalSamples = editMatrixTotal.value
    const lines = editForm.budgetLines.map(l => ({
      ...l,
      planned: Math.max(0, l.planned || 0),
      committed: Math.max(0, l.planned || 0) * l.rate,
    }))
    const committed = lines.reduce((sum, l) => sum + l.committed, 0)
    const invoiced = lines.reduce((sum, l) => sum + l.invoiced, 0)

    const snap = {
      name: study.value.name,
      abbreviation: study.value.abbreviation ?? '',
      stage: study.value.stage,
      affiliation: study.value.affiliation,
      piName: study.value.pi.name,
      piEmail: study.value.pi.email,
      leadName: study.value.studyLead?.name ?? '',
      leadEmail: study.value.studyLead?.email ?? '',
      irb: study.value.irb ?? '',
      objectives: study.value.objectives ?? '',
      phlebotomy: study.value.phlebotomy ?? '',
      metadata: study.value.metadata ?? '',
      cohortSubjects: study.value.cohort.subjects,
      cohortSampleType: study.value.cohort.sampleType ?? '',
      services: [...(study.value.budget.lines || [])].map(l => l.service).sort().join('|'),
    }
    const changes: string[] = []
    if (editForm.name.trim() !== snap.name) changes.push('name')
    if (editForm.abbreviation.trim() !== snap.abbreviation) changes.push('abbreviation')
    if (editForm.stage !== snap.stage) changes.push(`stage → ${editForm.stage}`)
    if (editForm.affiliation !== snap.affiliation) changes.push(`affiliation → ${editForm.affiliation}`)
    if (editForm.piName.trim() !== snap.piName || editForm.piEmail.trim() !== snap.piEmail) changes.push('PI')
    if (editForm.studyLeadName.trim() !== snap.leadName || editForm.studyLeadEmail.trim() !== snap.leadEmail) changes.push('study lead')
    if (editForm.irb.trim() !== snap.irb) changes.push('IRB')
    if (editForm.objectives.trim() !== snap.objectives) changes.push('objectives')
    if (editForm.phlebotomy !== snap.phlebotomy) changes.push('phlebotomy')
    if (editForm.metadata !== snap.metadata) changes.push('metadata plan')
    if (subjects !== snap.cohortSubjects || editForm.cohortSampleType.trim() !== snap.cohortSampleType) changes.push('cohort')
    if ([...editForm.budgetLines].map(l => l.service).sort().join('|') !== snap.services) changes.push('services')
    const changeNote = changes.length > 0 ? `Updated: ${changes.join(', ')}` : undefined

    await adminStore.updateStudy(study.value.id, {
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
      objectives: editForm.objectives.trim() || undefined,
      phlebotomy: editForm.phlebotomy.trim() || undefined,
      metadata: editForm.metadata.trim() || undefined,
      cohort: {
        ...study.value.cohort,
        subjects,
        totalSamples,
        sampleType: editForm.cohortSampleType.trim(),
        groups: normalizeGroups(editForm.cohortGroups),
      },
      budget: {
        ...study.value.budget,
        lines,
        committed,
        invoiced,
        remaining: committed - invoiced,
        pctInvoiced: committed > 0 ? Math.round(invoiced / committed * 100) : 0,
        accountCode: editForm.affiliation === 'Internal' ? (editForm.accountCode.trim() || null) : null,
        fundingName: editForm.affiliation === 'Internal' ? (editForm.fundingName.trim() || null) : null,
        baName: editForm.affiliation === 'Internal' ? (editForm.baName.trim() || null) : null,
        baEmail: editForm.affiliation === 'Internal' ? (editForm.baEmail.trim() || null) : null,
        contractingContact: editForm.affiliation !== 'Internal' ? (editForm.contractingContact.trim() || null) : null,
      },
      intakeDetails: cleanIntakeDetails(editForm.intakeDetails),
    }, changeNote)
    editOpen.value = false
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

const isActivated = computed(() =>
  study.value?.stage === 'Processing' || study.value?.stage === 'Complete',
)

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
          <div class="meta-item">
            <span class="meta-label">Sample type</span>
            <span class="meta-val">{{ study.cohort.sampleType }}</span>
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
      <h3>Lifecycle</h3>
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
          <div class="info-lbl">Objectives</div>
          <div>{{ study.objectives }}</div>

          <template v-if="study.additionalNotes">
            <div class="info-lbl">Additional notes</div>
            <div>{{ study.additionalNotes }}</div>
          </template>

          <div class="info-lbl">PI / Lead</div>
          <div>
            {{ study.pi.name }} (PI)
            <template v-if="study.studyLead"> · {{ study.studyLead.name }} (lead) · <span class="mono">{{ study.studyLead.email }}</span></template>
          </div>

          <template v-if="study.budget.fundingName || study.budget.baName">
            <div class="info-lbl">Funding / billing</div>
            <div>
              <div v-if="study.budget.fundingName">{{ study.budget.fundingName }}</div>
              <div v-if="study.budget.baName">{{ study.budget.baName }}<template v-if="study.budget.baEmail"> · <span class="mono">{{ study.budget.baEmail }}</span></template></div>
            </div>
          </template>

          <template v-if="study.budget.contractingContact">
            <div class="info-lbl">Contracting contact</div>
            <div><span class="mono">{{ study.budget.contractingContact }}</span></div>
          </template>

          <div v-if="study.department" class="info-lbl">Department</div>
          <div v-if="study.department">{{ study.department }}</div>

          <div v-if="study.phlebotomy" class="info-lbl">Phlebotomy</div>
          <div v-if="study.phlebotomy">{{ study.phlebotomy }}</div>

          <div v-if="study.metadata" class="info-lbl">Metadata</div>
          <div v-if="study.metadata">{{ study.metadata }}</div>

          <div class="info-lbl">Services</div>
          <div>
            <div v-for="line in study.budget.lines" :key="line.service">
              {{ line.service }} · <span class="mono">${{ line.rate }} × {{ line.planned }}</span>
            </div>
          </div>

          <template v-if="cohortGroups.length">
            <div class="info-lbl">Cohort sample matrix</div>
            <div>
              <table class="sched-table">
                <thead>
                  <tr>
                    <th>Cohort</th>
                    <th>Subs</th>
                    <th v-for="tp in TIMEPOINTS" :key="tp.key">{{ tp.short }}</th>
                    <th>Samples</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(g, i) in cohortGroups" :key="i">
                    <td>{{ g.name || '—' }}</td>
                    <td class="mono">{{ g.subjects }}</td>
                    <td v-for="tp in TIMEPOINTS" :key="tp.key" class="mono">{{ g.samples?.[tp.key] || 0 }}</td>
                    <td class="mono">{{ groupTotal(g).toLocaleString() }}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr>
                    <td>Total</td>
                    <td class="mono">{{ cohortGroups.reduce((s, g) => s + (Number(g.subjects) || 0), 0).toLocaleString() }}</td>
                    <td v-for="tp in TIMEPOINTS" :key="tp.key" class="mono">
                      {{ cohortGroups.reduce((s, g) => s + (Number(g.subjects) || 0) * (Number(g.samples?.[tp.key]) || 0), 0).toLocaleString() }}
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
            <div style="padding:0.7rem 0.9rem; background:var(--cream); border-radius:var(--radius);">
              <div style="font-size:0.62rem; text-transform:uppercase; letter-spacing:0.1em; color:var(--muted); font-weight:600">Sample type</div>
              <div style="font-size:0.88rem; font-weight:500">{{ study.cohort.sampleType }}</div>
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
          <div class="info-lbl">Sample type</div>
          <div>{{ study.cohort.sampleType }}</div>
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
          <h3>Budget vs. actuals</h3>
          <span v-if="study.budget.accountCode" class="ctx">Account: {{ study.budget.accountCode }} · billed via iLabs</span>
        </div>
        <div class="budget-grid">
          <div class="budget-card">
            <div class="lbl">Committed</div>
            <div class="val">${{ study.budget.committed.toLocaleString() }}</div>
          </div>
          <div class="budget-card">
            <div class="lbl">Invoiced</div>
            <div class="val" style="color:var(--warm)">${{ study.budget.invoiced.toLocaleString() }}</div>
          </div>
          <div class="budget-card">
            <div class="lbl">Remaining</div>
            <div class="val" style="color:var(--green)">${{ study.budget.remaining.toLocaleString() }}</div>
          </div>
        </div>
        <div class="budget-prog"><div :style="{ width: study.budget.pctInvoiced + '%' }" /></div>
        <div style="padding:0.6rem 1.4rem 0; font-size:0.78rem; color:var(--muted)">
          {{ study.budget.pctInvoiced }}% of committed budget invoiced
        </div>

        <table class="budget-table">
          <thead>
            <tr>
              <th>Service</th>
              <th>Rate</th>
              <th>Planned</th>
              <th>Completed</th>
              <th>Committed</th>
              <th>Invoiced</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="line in study.budget.lines" :key="line.service">
              <td>{{ line.service }}</td>
              <td class="mono">${{ line.rate }}</td>
              <td class="mono">{{ line.planned }}</td>
              <td class="mono">{{ line.completed }}</td>
              <td class="mono">${{ line.committed.toLocaleString() }}</td>
              <td class="mono">${{ line.invoiced.toLocaleString() }}</td>
            </tr>
            <tr style="background:rgba(0,0,0,0.02)">
              <td colspan="4" style="text-align:right; font-weight:600">Totals</td>
              <td class="mono" style="font-weight:600; color:var(--accent)">${{ study.budget.committed.toLocaleString() }}</td>
              <td class="mono" style="font-weight:600; color:var(--warm)">${{ study.budget.invoiced.toLocaleString() }}</td>
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
            <div class="em-field">
              <label class="em-label">Abbreviation</label>
              <input v-model="editForm.abbreviation" type="text">
            </div>
            <div class="em-field">
              <label class="em-label">IRB</label>
              <input v-model="editForm.irb" type="text">
            </div>
            <div class="em-field">
              <label class="em-label">Stage</label>
              <select v-if="isActivated" v-model="editForm.stage">
                <option>Processing</option>
                <option>Complete</option>
              </select>
              <div v-else class="em-computed">{{ editForm.stage }}</div>
            </div>
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

        <!-- Principal Investigator -->
        <div class="em-section">
          <div class="em-section-title">Principal Investigator</div>
          <div class="em-grid">
            <div class="em-field">
              <label class="em-label">PI name</label>
              <input v-model="editForm.piName" type="text">
            </div>
            <div class="em-field">
              <label class="em-label">PI email</label>
              <input v-model="editForm.piEmail" type="email">
            </div>
          </div>
        </div>

        <!-- Study Lead -->
        <div class="em-section">
          <div class="em-section-title">Study Lead <span class="em-section-opt">(optional)</span></div>
          <div class="em-grid">
            <div class="em-field">
              <label class="em-label">Lead name</label>
              <input v-model="editForm.studyLeadName" type="text">
            </div>
            <div class="em-field">
              <label class="em-label">Lead email</label>
              <input v-model="editForm.studyLeadEmail" type="email">
            </div>
          </div>
        </div>

        <!-- Study details -->
        <div class="em-section">
          <div class="em-section-title">Study details</div>
          <div class="em-field em-full" style="margin-bottom:0.75rem;">
            <label class="em-label">Objectives</label>
            <textarea v-model="editForm.objectives" rows="3" />
          </div>
          <div class="em-grid">
            <div class="em-field">
              <label class="em-label">Phlebotomy</label>
              <select v-model="editForm.phlebotomy">
                <option value="">—</option>
                <option>IH phlebotomist on campus</option>
                <option>Remote phlebotomy needed</option>
                <option>Study team will collect and transfer</option>
                <option>N/A – using stored samples</option>
              </select>
            </div>
            <div class="em-field">
              <label class="em-label">Metadata plan</label>
              <select v-model="editForm.metadata">
                <option value="">—</option>
                <option>REDCap</option>
                <option>Other system</option>
                <option>To be discussed</option>
              </select>
            </div>
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
            <div v-if="editForm.budgetLines.length === 0" class="em-srv-empty">No services added yet.</div>
          </div>
          <select
            v-if="availableToAdd.length > 0"
            v-model="newServiceId"
            style="width:auto; margin-top:0.4rem;"
            @change="addServiceLine"
          >
            <option value="">+ Add service…</option>
            <option v-for="svc in availableToAdd" :key="svc.id" :value="svc.id">{{ svc.name }}</option>
          </select>
        </div>

        <!-- Cohort -->
        <div class="em-section">
          <div class="em-section-title">Cohort</div>
          <div class="em-grid">
            <div class="em-field">
              <label class="em-label">Sample type</label>
              <select v-model="editForm.cohortSampleType">
                <option value="">—</option>
                <option>Fresh whole blood</option>
                <option>Stored PBMCs (cryopreserved)</option>
                <option>Tissue</option>
                <option>Other</option>
              </select>
            </div>
            <div class="em-field">
              <label class="em-label">Total samples</label>
              <div class="em-computed">
                {{ editMatrixTotal.toLocaleString() }}
                <span class="em-computed-note">from matrix below</span>
              </div>
            </div>
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
                  <th v-for="tp in TIMEPOINTS" :key="tp.key">{{ tp.short }}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                <tr v-for="(g, i) in editForm.cohortGroups" :key="i">
                  <td><input v-model="g.name" type="text" placeholder="Cohort name"></td>
                  <td><input v-model.number="g.subjects" type="number" min="0"></td>
                  <td v-for="tp in TIMEPOINTS" :key="tp.key">
                    <input v-model.number="g.samples[tp.key]" type="number" min="0">
                  </td>
                  <td><button class="em-srv-remove" type="button" @click="removeEditGroup(i)">✕</button></td>
                </tr>
                <tr v-if="!editForm.cohortGroups.length">
                  <td :colspan="TIMEPOINTS.length + 3" class="em-srv-empty">No cohorts yet.</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="em-matrix-foot">
            <button class="btn btn-ghost btn-sm" type="button" @click="addEditGroup">+ Add cohort</button>
            <span class="em-matrix-total">{{ editMatrixSubjects.toLocaleString() }} subjects · {{ editMatrixTotal.toLocaleString() }} samples</span>
          </div>
        </div>

        <!-- Expanded intake answers — rendered from the shared schema -->
        <div v-for="group in fieldsBySection" :key="group.section" class="em-section">
          <div class="em-section-title">{{ group.section }}</div>
          <IntakeFields :fields="group.fields" :model="editForm.intakeDetails" variant="modal" show-all />
        </div>
      </div>
      <div class="em-foot">
        <button class="btn btn-ghost btn-sm" :disabled="isSaving" @click="editOpen = false">Cancel</button>
        <button class="btn btn-primary btn-sm" :disabled="isSaving || !editForm.name.trim() || !hasChanges" @click="saveEdit">
          {{ isSaving ? 'Saving…' : 'Save changes' }}
        </button>
      </div>
    </div>
  </div>
</template>
