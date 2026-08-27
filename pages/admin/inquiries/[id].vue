<script setup lang="ts">
import { useAdminStore } from '~/stores/admin'
import type { Affiliation } from '~/stores/admin'
import { useServicesStore } from '~/stores/services'
import type { CollectionVisit } from '~/types/index'
import { INTAKE_FIELDS, INTAKE_SECTIONS, intakeDetailRows, cleanIntakeDetails } from '~/utils/intakeFields'
import { leadDetailRows } from '~/utils/leadFields'

definePageMeta({ layout: 'admin' })

const { relativeTime } = useRelativeTime()
const route = useRoute()
const adminStore = useAdminStore()

const inquiry = computed(() => adminStore.inquiries.find(i => i.id === route.params.id))

if (!inquiry.value) {
  navigateTo('/admin/inquiries')
}

const affiliationClass = computed(() => {
  if (!inquiry.value) return ''
  if (inquiry.value.affiliation === 'Internal') return 'b-internal'
  if (inquiry.value.affiliation === 'External') return 'b-external'
  return 'b-industry'
})

const feasibilityComplete = computed(() =>
  !!inquiry.value?.feasibility.length && inquiry.value.feasibility.every(i => i.checked),
)

// Lead phase: the full intake form hasn't been submitted yet ('On Hold' is a
// paused lead — still pre-intake, so it shows the lead panel and checklist).
const isLead = computed(() =>
  inquiry.value?.status === 'Lead'
  || inquiry.value?.status === 'Intake Sent'
  || inquiry.value?.status === 'On Hold',
)

// The full-intake form may only be sent once the checklist is complete AND the
// lead was explicitly cleared to proceed (a re-send is already past that gate).
const canSendIntake = computed(() => {
  if (!feasibilityComplete.value) return false
  if (inquiry.value?.status === 'Intake Sent') return true
  return inquiry.value?.leadDecision === 'proceed'
})
const sendIntakeTip = computed(() => {
  if (canSendIntake.value) return undefined
  if (!feasibilityComplete.value) return 'Complete the lead checklist below before sending the billing form'
  return 'Select “Proceed to next step” below before sending the billing form'
})

// Intro-meeting go/no-go decision (radio + follow-up date), see verifyLink panel
const todayIso = new Date().toISOString().slice(0, 10)
const decisionChoice = ref<'proceed' | 'hold' | ''>('')
const holdDateInput = ref('')
const isSavingDecision = ref(false)
// Keep the local controls in sync as the inquiry loads / updates. The radio
// reflects the *persisted* decision, and only while the checklist is complete:
//  - an incomplete (or newly-unchecked) checklist unsets the selection, and
//  - navigating away and back re-derives from persisted state, so a "pause"
//    that was picked but never committed with a date doesn't linger.
watchEffect(() => {
  decisionChoice.value = feasibilityComplete.value ? (inquiry.value?.leadDecision ?? '') : ''
  holdDateInput.value = inquiry.value?.holdUntil ?? ''
})
const holdDue = computed(() =>
  !!inquiry.value?.holdUntil && inquiry.value.holdUntil <= todayIso,
)
function formatHoldDate(iso?: string) {
  if (!iso) return ''
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

async function chooseProceed() {
  if (!inquiry.value || isSavingDecision.value) return
  isSavingDecision.value = true
  try {
    await adminStore.setLeadDecision(inquiry.value.id, 'proceed')
  }
  catch {
    alert('Failed to update the lead decision. Please try again.')
    decisionChoice.value = inquiry.value.leadDecision ?? ''
  }
  finally {
    isSavingDecision.value = false
  }
}

async function pauseLead() {
  if (!inquiry.value || isSavingDecision.value || !holdDateInput.value) return
  isSavingDecision.value = true
  try {
    await adminStore.setLeadDecision(inquiry.value.id, 'hold', holdDateInput.value)
  }
  catch {
    alert('Failed to pause the lead. Please try again.')
  }
  finally {
    isSavingDecision.value = false
  }
}
// Lead-form answers (role, referral source, …) — shown for the whole lifecycle
const leadRows = computed(() => leadDetailRows(inquiry.value?.leadDetails))

// Read-only rows for the expanded intake answers (schema-driven: raw value -> label)
const detailRows = computed(() => intakeDetailRows(inquiry.value?.intakeDetails))

// Unified, newest-first feed of activity events (field edits, status changes)
// and reviewer notes — mirrors how studies track history.
const activityFeed = computed(() => {
  const inq = inquiry.value
  if (!inq) return []
  const events = (inq.activity || []).map(a => ({
    dot: a.dotClass || '',
    title: a.title,
    meta: [a.author, a.date].filter(Boolean).join(' · '),
    note: a.note || '',
    ts: a.ts || 0,
  }))
  const notes = (inq.notes || []).map(n => ({
    dot: 'm',
    title: n.author,
    meta: n.date,
    note: n.text,
    ts: n.ts || 0,
  }))
  return [...events, ...notes].sort((a, b) => b.ts - a.ts)
})
// Fields the edit modal shows, grouped by section (from the shared schema)
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

const visits = computed(() => inquiry.value?.collectionVisits || [])
const collectionGroups = computed(() => inquiry.value?.collectionGroups || [])
const keyPersonnel = computed(() => inquiry.value?.keyPersonnel || [])
const groupTotal = (g: { subjects: number; samples: Record<string, number> }, visitList: CollectionVisit[]) =>
  (Number(g.subjects) || 0) * visitList.reduce((s, v) => s + (Number(g.samples?.[v.id]) || 0), 0)
const matrixGrandTotal = computed(() =>
  collectionGroups.value.reduce((s, g) => s + groupTotal(g, visits.value), 0),
)

// Generate a stable id for a new visit column (used as the key in every
// group's `samples` map)
function newVisitId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `v-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

const isApproving = ref(false)
const isDeclining = ref(false)
const declineOpen = ref(false)

const noteText = ref('')
const isPostingNote = ref(false)

async function postNote() {
  if (!inquiry.value || !noteText.value.trim()) return
  isPostingNote.value = true
  try {
    const { note } = await $fetch('/api/admin/add-inquiry-note', {
      method: 'POST',
      body: { inquiryId: inquiry.value.id, text: noteText.value, author: adminStore.user.name, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone },
    }) as { note: { author: string; date: string; text: string } }
    inquiry.value.notes.unshift(note)
    noteText.value = ''
  }
  catch {
    alert('Failed to save note. Please try again.')
  }
  finally {
    isPostingNote.value = false
  }
}

// Toggles fire their own independent request. If two land close together,
// out-of-order responses can silently overwrite each other's checklist
// state, so saves are chained to run strictly one at a time — each request
// reads inquiry.value.feasibility only once it's its turn, always
// capturing every toggle made while it waited.
let feasibilitySaveChain = Promise.resolve()

function toggleFeasibility(item: { label: string; checked: boolean }) {
  if (!inquiry.value) return
  const inquiryId = inquiry.value.id
  item.checked = !item.checked
  feasibilitySaveChain = feasibilitySaveChain.then(async () => {
    try {
      await $fetch('/api/admin/update-inquiry-feasibility', {
        method: 'POST',
        body: { inquiryId, feasibility: inquiry.value?.feasibility },
      })
    }
    catch {
      item.checked = !item.checked
    }
  })
}

async function approveAndSend() {
  if (!inquiry.value) return
  isApproving.value = true
  try {
    const { studyId } = await $fetch('/api/admin/approve-inquiry', {
      method: 'POST',
      body: { inquiryId: inquiry.value.id, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone },
    }) as { studyId: string }
    await adminStore.loadAll()
    navigateTo(`/admin/studies/${studyId}`)
  }
  catch {
    alert('Failed to approve inquiry. Please try again.')
  }
  finally {
    isApproving.value = false
  }
}

const isSendingIntake = ref(false)
const intakeSentMessage = ref('')

async function sendIntakeForm() {
  if (!inquiry.value) return
  isSendingIntake.value = true
  intakeSentMessage.value = ''
  try {
    const sentDate = await adminStore.sendIntakeLink(inquiry.value.id)
    intakeSentMessage.value = `Intake form emailed to ${inquiry.value.pi.email} on ${sentDate}`
  }
  catch {
    alert('Failed to send the intake form. Please try again.')
  }
  finally {
    isSendingIntake.value = false
  }
}

async function confirmDecline() {
  if (!inquiry.value) return
  isDeclining.value = true
  try {
    await $fetch('/api/admin/decline-inquiry', {
      method: 'POST',
      body: { inquiryId: inquiry.value.id },
    })
    await adminStore.loadAll()
    navigateTo('/admin/inquiries')
  }
  catch {
    alert('Failed to decline inquiry. Please try again.')
    isDeclining.value = false
  }
}

const servicesStore = useServicesStore()

onMounted(async () => {
  if (servicesStore.services.length === 0) {
    await servicesStore.fetchServices()
  }
})

const editOpen = ref(false)
const isSaving = ref(false)
const newServiceId = ref('')

// Editable through the whole pre-decision lifecycle: leads and intake-sent
// inquiries can be filled out with the PI during the introductory meeting, so
// the entered fields pre-fill the emailed full intake form. Approved / declined
// inquiries are terminal.
const isEditable = computed(() =>
  !!inquiry.value && inquiry.value.status !== 'Approved' && inquiry.value.status !== 'Declined',
)

// Whether any study-shaped data has been captured yet (used to reveal the
// read-only intake snapshot for a lead once the admin has started filling it in)
const hasStudyData = computed(() =>
  !!inquiry.value?.studyName || detailRows.value.length > 0 || collectionGroups.value.length > 0,
)

type ServiceLine = { name: string; qty: number; rate: string | number }

const editForm = reactive({
  studyName: '',
  abbreviation: '',
  piName: '',
  piEmail: '',
  studyLeadName: '',
  studyLeadEmail: '',
  affiliation: 'Internal' as Affiliation,
  affiliationOrg: '',
  irb: '',
  budgetCode: '',
  fundingName: '',
  baName: '',
  baEmail: '',
  contractingContact: '',
  additionalNotes: '',
  servicesDetail: [] as ServiceLine[],
  intakeDetails: {} as Record<string, unknown>,
  collectionGroups: [] as Array<{ name: string; description?: string; subjects: number; samples: Record<string, number> }>,
  visits: [] as CollectionVisit[],
  keyPersonnel: [] as Array<{ name: string; email: string; role: string }>,
})

// Normalise a cohort matrix to numeric cells, keyed by the given visit list,
// for comparison / saving
function normalizeGroups(
  groups: Array<{ name: string; description?: string; subjects: number; samples: Record<string, number> }>,
  visitList: CollectionVisit[],
) {
  return groups.map(g => ({
    name: g.name || '',
    description: g.description || '',
    subjects: Number(g.subjects) || 0,
    samples: Object.fromEntries(visitList.map(v => [v.id, Number(g.samples?.[v.id]) || 0])),
  }))
}

function addEditGroup() {
  editForm.collectionGroups.push({
    name: '',
    description: '',
    subjects: 0,
    samples: Object.fromEntries(editForm.visits.map(v => [v.id, 0])),
  })
}
function removeEditGroup(i: number) {
  editForm.collectionGroups.splice(i, 1)
}

function addEditVisit() {
  const visit: CollectionVisit = { id: newVisitId(), label: '', description: '' }
  editForm.visits.push(visit)
  editForm.collectionGroups.forEach((g) => { g.samples[visit.id] = 0 })
}
function removeEditVisit(i: number) {
  const visit = editForm.visits[i]
  if (!visit) return
  const hasData = editForm.collectionGroups.some(g => Number(g.samples?.[visit.id]) > 0)
  if (hasData && !confirm(`Remove "${visit.label || 'this visit'}"? This will discard the sample counts already entered for it across every cohort.`)) return
  editForm.visits.splice(i, 1)
  editForm.collectionGroups.forEach((g) => {
    const { [visit.id]: _removed, ...rest } = g.samples
    g.samples = rest
  })
}

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

// Cohort scope is derived from the edited matrix, not entered by hand.
const editMatrixSubjects = computed(() =>
  editForm.collectionGroups.reduce((s, g) => s + (Number(g.subjects) || 0), 0),
)
const editMatrixTotal = computed(() =>
  editForm.collectionGroups.reduce(
    (s, g) => s + (Number(g.subjects) || 0)
      * editForm.visits.reduce((a, v) => a + (Number(g.samples?.[v.id]) || 0), 0),
    0,
  ),
)
const availableToAdd = computed(() =>
  servicesStore.activeServices.filter(
    svc => !editForm.servicesDetail.some(l => l.name === svc.name),
  ),
)

function addServiceLine() {
  if (!newServiceId.value) return
  const svc = servicesStore.services.find(s => s.id === newServiceId.value)
  if (!svc) return
  const rate = editForm.affiliation === 'Internal' ? (svc.internalRate ?? 0) : (svc.externalRate ?? 0)
  editForm.servicesDetail.push({ name: svc.name, qty: 1, rate })
  newServiceId.value = ''
}

function removeServiceLine(i: number) {
  editForm.servicesDetail.splice(i, 1)
}

const hasChanges = computed(() => {
  if (!inquiry.value || !editOpen.value) return false
  const q = inquiry.value
  if (editForm.studyName.trim() !== q.studyName) return true
  if (editForm.abbreviation.trim() !== (q.abbreviation ?? '')) return true
  if (editForm.piName.trim() !== q.pi.name || editForm.piEmail.trim() !== q.pi.email) return true
  if (editForm.studyLeadName.trim() !== (q.studyLead?.name ?? '') || editForm.studyLeadEmail.trim() !== (q.studyLead?.email ?? '')) return true
  if (editForm.affiliation !== q.affiliation) return true
  if (editForm.affiliationOrg.trim() !== (q.affiliationOrg ?? '')) return true
  if (editForm.irb.trim() !== (q.irb ?? '')) return true
  if (editForm.budgetCode.trim() !== (q.budgetCode ?? '')) return true
  if (editForm.fundingName.trim() !== (q.fundingName ?? '')) return true
  if (editForm.baName.trim() !== (q.baName ?? '')) return true
  if (editForm.baEmail.trim() !== (q.baEmail ?? '')) return true
  if (editForm.contractingContact.trim() !== (q.contractingContact ?? '')) return true
  if (editForm.additionalNotes.trim() !== (q.additionalNotes ?? '')) return true
  if (editMatrixSubjects.value !== q.cohortSubjects) return true
  if (editForm.servicesDetail.length !== q.servicesDetail.length) return true
  for (let i = 0; i < editForm.servicesDetail.length; i++) {
    if (editForm.servicesDetail[i].name !== q.servicesDetail[i].name || editForm.servicesDetail[i].qty !== q.servicesDetail[i].qty) return true
  }
  // Expanded intake answers
  if (JSON.stringify(cleanIntakeDetails(editForm.intakeDetails)) !== JSON.stringify(cleanIntakeDetails(q.intakeDetails ?? {}))) return true
  // Visit schedule
  if (JSON.stringify(editForm.visits) !== JSON.stringify(q.collectionVisits ?? [])) return true
  // Cohort sample matrix (normalised against the currently-edited visit list)
  if (JSON.stringify(normalizeGroups(editForm.collectionGroups, editForm.visits)) !== JSON.stringify(normalizeGroups(q.collectionGroups ?? [], editForm.visits))) return true
  // Key personnel
  if (JSON.stringify(normalizePersonnel(editForm.keyPersonnel)) !== JSON.stringify(normalizePersonnel(q.keyPersonnel ?? []))) return true
  return false
})

function openEdit() {
  if (!inquiry.value || !isEditable.value) return
  const q = inquiry.value
  editForm.studyName = q.studyName
  editForm.abbreviation = q.abbreviation ?? ''
  editForm.piName = q.pi.name
  editForm.piEmail = q.pi.email
  editForm.studyLeadName = q.studyLead?.name ?? ''
  editForm.studyLeadEmail = q.studyLead?.email ?? ''
  editForm.affiliation = q.affiliation
  editForm.affiliationOrg = q.affiliationOrg ?? ''
  editForm.irb = q.irb ?? ''
  editForm.budgetCode = q.budgetCode ?? ''
  editForm.fundingName = q.fundingName ?? ''
  editForm.baName = q.baName ?? ''
  editForm.baEmail = q.baEmail ?? ''
  editForm.contractingContact = q.contractingContact ?? ''
  editForm.additionalNotes = q.additionalNotes ?? ''
  editForm.servicesDetail = q.servicesDetail.map(s => ({ ...s }))
  editForm.intakeDetails = JSON.parse(JSON.stringify(q.intakeDetails ?? {}))
  editForm.visits = (q.collectionVisits ?? []).map(v => ({ ...v }))
  editForm.collectionGroups = normalizeGroups(q.collectionGroups ?? [], editForm.visits)
  editForm.keyPersonnel = (q.keyPersonnel ?? []).map(p => ({ ...p }))
  newServiceId.value = ''
  editOpen.value = true
}

// Human-readable summary of which fields changed, for the activity log
function buildChangeNote(): string | undefined {
  const q = inquiry.value
  if (!q) return undefined
  const changes: string[] = []
  if (editForm.studyName.trim() !== (q.studyName ?? '')) changes.push('study name')
  if (editForm.abbreviation.trim() !== (q.abbreviation ?? '')) changes.push('abbreviation')
  if (editForm.piName.trim() !== q.pi.name || editForm.piEmail.trim() !== q.pi.email) changes.push('PI')
  if (editForm.studyLeadName.trim() !== (q.studyLead?.name ?? '') || editForm.studyLeadEmail.trim() !== (q.studyLead?.email ?? '')) changes.push('study lead')
  if (editForm.affiliation !== q.affiliation) changes.push('affiliation')
  if (editForm.affiliationOrg.trim() !== (q.affiliationOrg ?? '')) changes.push('institution')
  if (editForm.irb.trim() !== (q.irb ?? '')) changes.push('IRB')
  if (editForm.additionalNotes.trim() !== (q.additionalNotes ?? '')) changes.push('additional notes')
  if (editForm.budgetCode.trim() !== (q.budgetCode ?? '')) changes.push('budget code')
  if (editForm.fundingName.trim() !== (q.fundingName ?? '')) changes.push('funding source')
  if (editForm.baName.trim() !== (q.baName ?? '') || editForm.baEmail.trim() !== (q.baEmail ?? '')) changes.push('business administrator')
  if (editForm.contractingContact.trim() !== (q.contractingContact ?? '')) changes.push('contracting contact')
  const svcChanged = editForm.servicesDetail.length !== q.servicesDetail.length
    || editForm.servicesDetail.some((l, i) => l.name !== q.servicesDetail[i]?.name || l.qty !== q.servicesDetail[i]?.qty)
  if (svcChanged) changes.push('services')
  if (JSON.stringify(cleanIntakeDetails(editForm.intakeDetails)) !== JSON.stringify(cleanIntakeDetails(q.intakeDetails ?? {}))) changes.push('intake questionnaire')
  if (JSON.stringify(editForm.visits) !== JSON.stringify(q.collectionVisits ?? [])) changes.push('visit schedule')
  if (JSON.stringify(normalizeGroups(editForm.collectionGroups, editForm.visits)) !== JSON.stringify(normalizeGroups(q.collectionGroups ?? [], editForm.visits))) changes.push('cohort matrix')
  if (JSON.stringify(normalizePersonnel(editForm.keyPersonnel)) !== JSON.stringify(normalizePersonnel(q.keyPersonnel ?? []))) changes.push('key personnel')
  return changes.length ? `Updated: ${changes.join(', ')}` : undefined
}

async function saveEdit() {
  if (!inquiry.value) return
  isSaving.value = true
  try {
    const changeNote = buildChangeNote()
    const servicesDetail = editForm.servicesDetail.map(s => ({ ...s, qty: Math.max(0, s.qty as number) }))
    const estimate = servicesDetail.reduce((sum, s) => {
      const rate = typeof s.rate === 'number' ? s.rate : 0
      return sum + rate * s.qty
    }, 0)
    await adminStore.updateInquiry(inquiry.value.id, {
      studyName: editForm.studyName.trim(),
      abbreviation: editForm.abbreviation.trim(),
      pi: { name: editForm.piName.trim(), email: editForm.piEmail.trim() },
      studyLead: editForm.studyLeadName.trim()
        ? { name: editForm.studyLeadName.trim(), email: editForm.studyLeadEmail.trim() }
        : undefined,
      affiliation: editForm.affiliation,
      affiliationOrg: editForm.affiliationOrg.trim(),
      irb: editForm.irb.trim(),
      additionalNotes: editForm.additionalNotes.trim() || undefined,
      cohortSubjects: editMatrixSubjects.value,
      servicesDetail,
      budgetCode: editForm.affiliation === 'Internal' ? (editForm.budgetCode.trim() || undefined) : undefined,
      fundingName: editForm.affiliation === 'Internal' ? (editForm.fundingName.trim() || undefined) : undefined,
      baName: editForm.affiliation === 'Internal' ? (editForm.baName.trim() || undefined) : undefined,
      baEmail: editForm.affiliation === 'Internal' ? (editForm.baEmail.trim() || undefined) : undefined,
      contractingContact: editForm.affiliation !== 'Internal' ? (editForm.contractingContact.trim() || undefined) : undefined,
      estimate: estimate > 0 ? estimate : undefined,
      intakeDetails: cleanIntakeDetails(editForm.intakeDetails),
      collectionVisits: editForm.visits,
      collectionGroups: normalizeGroups(editForm.collectionGroups, editForm.visits),
      keyPersonnel: normalizePersonnel(editForm.keyPersonnel),
    }, changeNote)
    editOpen.value = false
  }
  catch (err: unknown) {
    console.error('[saveEdit inquiry]', err)
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
</script>

<template>
  <div v-if="inquiry">
    <div class="crumbs">
      <NuxtLink to="/admin/inquiries" class="crumb-link">Inquiries</NuxtLink>
      <span class="sep">›</span>
      <span>{{ inquiry.studyName ? `${inquiry.studyName} · ` : '' }}{{ inquiry.pi.name }}</span>
    </div>

    <!-- Hero -->
    <div class="detail-hero">
      <div>
        <h2>
          {{ inquiry.studyName || inquiry.pi.name }}
          <span v-if="inquiry.abbreviation" class="acronym">{{ inquiry.abbreviation }}</span>
          <span class="adm-badge" :class="affiliationClass">
            <span class="dot" /> {{ inquiry.affiliation }}
          </span>
          <span v-if="inquiry.status === 'Declined'" class="adm-badge b-declined">
            <span class="dot" /> Declined
          </span>
          <span v-else-if="inquiry.status === 'Approved'" class="adm-badge b-complete">
            <span class="dot" /> Approved
          </span>
          <span v-else-if="inquiry.status === 'Lead'" class="adm-badge b-lead">
            <span class="dot" /> New lead
          </span>
          <span v-else-if="inquiry.status === 'Intake Sent'" class="adm-badge b-agreement">
            <span class="dot" /> Intake sent
          </span>
          <span v-else-if="inquiry.status === 'On Hold'" class="adm-badge b-hold">
            <span class="dot" /> On hold
          </span>
          <span v-else class="adm-badge b-review">
            <span class="dot" /> In review
          </span>
        </h2>
        <div class="pi-line">
          <strong>{{ inquiry.pi.name }}</strong> · {{ inquiry.affiliationOrg }} ·
          <span class="mono">{{ inquiry.pi.email }}</span>
        </div>
        <div class="meta-strip">
          <div class="meta-item">
            <span class="meta-label">Submitted</span>
            <span class="meta-val">{{ inquiry.submittedDate }} · {{ relativeTime(inquiry.createdAt) }}</span>
          </div>
          <div v-if="inquiry.irb" class="meta-item">
            <span class="meta-label">IRB</span>
            <span class="meta-val">{{ inquiry.irb }}</span>
          </div>
          <div v-if="!isLead" class="meta-item">
            <span class="meta-label">Cohort scope</span>
            <span class="meta-val">{{ inquiry.cohortSubjects }} subjects · {{ matrixGrandTotal.toLocaleString() }} samples</span>
          </div>
          <div v-if="inquiry.status === 'Intake Sent' && inquiry.intakeSentDate" class="meta-item">
            <span class="meta-label">Intake sent</span>
            <span class="meta-val">{{ inquiry.intakeSentDate }}</span>
          </div>
          <div v-if="inquiry.status === 'On Hold' && inquiry.holdUntil" class="meta-item">
            <span class="meta-label">{{ holdDue ? 'Follow-up due' : 'Follow up' }}</span>
            <span class="meta-val" :class="{ 'meta-due': holdDue }">{{ formatHoldDate(inquiry.holdUntil) }}</span>
          </div>
          <div v-if="inquiry.estimate" class="meta-item">
            <span class="meta-label">Estimate</span>
            <span class="meta-val">${{ inquiry.estimate.toLocaleString() }}</span>
          </div>
        </div>
      </div>
      <div class="hero-actions">
        <template v-if="isLead">
          <span
            class="tip-left"
            style="width:100%"
            :data-tip="sendIntakeTip"
          >
            <button
              class="btn btn-primary"
              style="width:100%"
              :disabled="isSendingIntake || isDeclining || !canSendIntake"
              @click="sendIntakeForm"
            >
              {{ isSendingIntake ? 'Sending…' : (inquiry.status === 'Intake Sent' ? 'Re-send billing form ✉' : 'Send billing form ✉') }}
            </button>
          </span>
          <div v-if="intakeSentMessage" style="font-size:0.78rem; color:var(--green); text-align:center;">{{ intakeSentMessage }}</div>
        </template>
        <template v-if="inquiry.status === 'New'">
          <span
            class="tip-left"
            style="width:100%"
            :data-tip="!feasibilityComplete ? 'Complete all feasibility checklist items before approving' : undefined"
          >
            <button
              class="btn btn-success"
              style="width:100%"
              :disabled="isApproving || isDeclining || !feasibilityComplete"
              @click="approveAndSend"
            >
              {{ isApproving ? 'Approving…' : 'Approve &amp; send agreements ✓' }}
            </button>
          </span>
        </template>
        <!-- Editable until the inquiry is approved/declined. For a lead this is
             where the admin fills the intake with the PI during the meeting. -->
        <button
          v-if="isEditable"
          class="btn btn-secondary btn-sm"
          style="width:100%"
          @click="openEdit"
        >
          {{ isLead ? 'Fill intake form ✎' : 'Edit ✎' }}
        </button>
        <template v-if="inquiry.status !== 'Declined' && inquiry.status !== 'Approved'">
          <button
            class="btn btn-danger btn-sm"
            style="width:100%"
            :disabled="isApproving || isDeclining"
            @click="declineOpen = true"
          >
            {{ isDeclining ? 'Declining… ✕' : 'Decline ✕' }}
          </button>
        </template>
      </div>
    </div>

    <!-- Two-column -->
    <div class="dt-grid">
      <div style="display:flex; flex-direction:column; gap:1.2rem; min-width:0;">
        <!-- Lead inquiry (the simple public form answers) -->
        <div v-if="isLead || leadRows.length" class="panel">
          <div class="panel-head">
            <h3>Lead inquiry</h3>
            <span class="ctx">submitted via public inquiry form</span>
          </div>
          <div class="study-info-grid">
            <div class="info-lbl">Contact</div>
            <div>{{ inquiry.pi.name }} · <span class="mono">{{ inquiry.pi.email }}</span></div>

            <div class="info-lbl">Affiliation</div>
            <div>{{ inquiry.affiliation }}<template v-if="inquiry.affiliationOrg"> — {{ inquiry.affiliationOrg }}</template></div>

            <template v-for="row in leadRows" :key="row.label">
              <div class="info-lbl">{{ row.label }}</div>
              <div>{{ row.value }}</div>
            </template>

            <template v-if="isLead">
              <div class="info-lbl">Billing form</div>
              <div>
                <template v-if="inquiry.status === 'Intake Sent'">
                  Form sent {{ inquiry.intakeSentDate }} — awaiting submission.
                </template>
                <template v-else-if="inquiry.status === 'On Hold'">
                  Paused — following up {{ formatHoldDate(inquiry.holdUntil) }} while the investigator sorts out funding / next steps.
                </template>
                <template v-else>
                  Not sent yet. After your conversation with the lead, use “Send billing form” to email them the billing form.
                </template>
              </div>
            </template>
          </div>
        </div>

        <!-- Intake snapshot (study details). Shown once submitted, or for a
             lead once the admin has started capturing study details — this is
             entered directly by the I3H team, not emailed to/filled by the PI. -->
        <div v-if="!isLead || hasStudyData" class="panel">
          <div class="panel-head">
            <h3>Intake submission</h3>
            <span class="ctx">captured internally by the I3H team</span>
          </div>
          <div class="study-info-grid">
          <template v-if="inquiry.studyLead">
            <div class="info-lbl">Project lead</div>
            <div>{{ inquiry.studyLead.name }} · <span class="mono">{{ inquiry.studyLead.email }}</span></div>
          </template>

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

          <div class="info-lbl">Services</div>
          <div>
            <div v-for="svc in inquiry.servicesDetail" :key="svc.name">
              {{ svc.name }} × {{ svc.qty }} — <span class="mono">{{ typeof svc.rate === 'number' ? (svc.rate === 0 ? 'Contact' : `$${svc.rate}/ea`) : svc.rate }}</span>
            </div>
          </div>

          <div class="info-lbl">Affiliation</div>
          <div>
            {{ inquiry.affiliation }} — {{ inquiry.affiliationOrg }}
          </div>

          <template v-if="inquiry.fundingName || inquiry.baName">
            <div class="info-lbl">Funding / billing</div>
            <div>
              <div v-if="inquiry.fundingName">{{ inquiry.fundingName }}</div>
              <div v-if="inquiry.baName">{{ inquiry.baName }}<template v-if="inquiry.baEmail"> · <span class="mono">{{ inquiry.baEmail }}</span></template></div>
            </div>
          </template>

          <template v-if="inquiry.contractingContact">
            <div class="info-lbl">Contracting contact</div>
            <div><span class="mono">{{ inquiry.contractingContact }}</span></div>
          </template>

          <template v-if="inquiry.additionalNotes">
            <div class="info-lbl">Additional notes</div>
            <div>{{ inquiry.additionalNotes }}</div>
          </template>

          <template v-for="row in detailRows" :key="row.label">
            <div class="info-lbl">{{ row.label }}</div>
            <div>{{ row.value }}</div>
          </template>

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

          <template v-if="collectionGroups.length">
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
                  <tr v-for="(g, i) in collectionGroups" :key="i">
                    <td>{{ g.name || '—' }}<template v-if="g.description"> — {{ g.description }}</template></td>
                    <td class="mono">{{ g.subjects }}</td>
                    <td v-for="v in visits" :key="v.id" class="mono">{{ g.samples?.[v.id] || 0 }}</td>
                    <td class="mono">{{ groupTotal(g, visits).toLocaleString() }}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr>
                    <td>Total</td>
                    <td class="mono">{{ collectionGroups.reduce((s, g) => s + (Number(g.subjects) || 0), 0).toLocaleString() }}</td>
                    <td v-for="v in visits" :key="v.id" class="mono">
                      {{ collectionGroups.reduce((s, g) => s + (Number(g.subjects) || 0) * (Number(g.samples?.[v.id]) || 0), 0).toLocaleString() }}
                    </td>
                    <td class="mono">{{ matrixGrandTotal.toLocaleString() }}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </template>
          </div>
        </div>
      </div>

      <!-- Right column -->
      <div style="display:flex; flex-direction:column; gap:1.2rem;">
        <div class="panel">
          <div class="panel-head"><h3>{{ isLead ? 'Lead checklist' : 'Feasibility checklist' }}</h3></div>
          <div style="padding:0.4rem 1.4rem 1.2rem; font-size:0.86rem;">
            <div
              v-for="item in inquiry.feasibility"
              :key="item.label"
              style="display:flex; align-items:center; gap:0.6rem; padding:0.45rem 0;"
            >
              <input type="checkbox" :checked="item.checked" @change="toggleFeasibility(item)">
              <span>{{ item.label }}</span>
            </div>

            <!-- Go/no-go after the intro meeting: either proceed to the full
                 intake, or pause the lead with a follow-up date. -->
            <div v-if="inquiry.status === 'Lead' || inquiry.status === 'On Hold'" class="decision-block">
              <div class="decision-label">After the introductory meeting</div>
              <label class="decision-opt" :class="{ 'is-disabled': !feasibilityComplete }">
                <input v-model="decisionChoice" type="radio" value="proceed" :disabled="isSavingDecision || !feasibilityComplete" @change="chooseProceed">
                <span>Proceed to next step with operational team</span>
              </label>
              <label class="decision-opt" :class="{ 'is-disabled': !feasibilityComplete }">
                <input v-model="decisionChoice" type="radio" value="hold" :disabled="isSavingDecision || !feasibilityComplete">
                <span>Pause — investigator needs time (funding, etc.)</span>
              </label>
              <div v-if="!feasibilityComplete" class="decision-hint">Complete the checklist above to choose the next step.</div>
              <div v-if="feasibilityComplete && decisionChoice === 'hold'" class="hold-row">
                <label class="hold-lbl">Follow up on</label>
                <input v-model="holdDateInput" type="date" :min="todayIso">
                <button class="btn btn-primary btn-sm" :disabled="!holdDateInput || isSavingDecision" @click="pauseLead">
                  {{ inquiry.status === 'On Hold' ? 'Update' : 'Pause lead' }}
                </button>
              </div>
              <div v-if="inquiry.status === 'On Hold' && inquiry.holdUntil" class="hold-note" :class="{ due: holdDue }">
                {{ holdDue ? 'Follow-up due' : 'On hold' }} · follow up {{ formatHoldDate(inquiry.holdUntil) }}
              </div>
            </div>
          </div>
        </div>

        <div class="panel">
          <div class="panel-head"><h3>Activity &amp; notes</h3></div>
          <div v-if="activityFeed.length" class="activity-timeline" style="max-height:320px; overflow-y:auto;">
            <div v-for="(item, i) in activityFeed" :key="i" class="t-item">
              <div class="t-dot" :class="item.dot" />
              <div class="t-body">
                <div class="t-title">{{ item.title }}</div>
                <div class="t-meta">{{ item.meta }}</div>
                <div v-if="item.note" class="t-note">{{ item.note }}</div>
              </div>
            </div>
          </div>
          <div v-else style="padding:0.8rem 1.4rem; font-size:0.84rem; color:var(--muted)">
            No activity yet.
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
  </div>

  <!-- Edit inquiry modal -->
  <div v-if="editOpen" class="clerk-overlay" @click.self="editOpen = false">
    <div class="edit-modal edit-modal-wide">
      <div class="em-head">
        <h3>Edit inquiry</h3>
      </div>
      <div class="em-body em-body-scroll">
        <!-- Study info -->
        <div class="em-section">
          <div class="em-section-title">Study info</div>
          <div class="em-grid">
            <div class="em-field em-full">
              <label class="em-label">Study name</label>
              <input v-model="editForm.studyName" type="text" autofocus @keydown.escape="editOpen = false">
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
                <tr v-for="(g, i) in editForm.collectionGroups" :key="i">
                  <td><input v-model="g.name" type="text" placeholder="Cohort name"></td>
                  <td><input v-model="g.description" type="text" placeholder="e.g. MS patients receiving anti-CD20"></td>
                  <td><button class="em-srv-remove" type="button" @click="removeEditGroup(i)">✕</button></td>
                </tr>
                <tr v-if="!editForm.collectionGroups.length">
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
                <tr v-for="(g, i) in editForm.collectionGroups" :key="i">
                  <td style="text-align:left;">{{ g.name || 'Untitled group' }}</td>
                  <td><input v-model.number="g.subjects" type="number" min="0"></td>
                  <td v-for="v in editForm.visits" :key="v.id">
                    <input v-model.number="g.samples[v.id]" type="number" min="0">
                  </td>
                  <td><button class="em-srv-remove" type="button" @click="removeEditGroup(i)">✕</button></td>
                </tr>
                <tr v-if="!editForm.collectionGroups.length">
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
            <div v-for="(line, i) in editForm.servicesDetail" :key="i" class="em-service-row">
              <span class="em-srv-name">{{ line.name }}</span>
              <span class="em-srv-rate">{{ typeof line.rate === 'number' && line.rate > 0 ? `$${line.rate}/ea` : 'Contact' }}</span>
              <input
                v-model.number="editForm.servicesDetail[i].qty"
                type="number"
                min="0"
                style="width:72px;"
              >
              <span class="em-srv-committed">{{ typeof line.rate === 'number' && line.rate > 0 ? `$${(line.rate * Math.max(0, (editForm.servicesDetail[i].qty as number) || 0)).toLocaleString()}` : '—' }}</span>
              <button class="em-srv-remove" type="button" @click="removeServiceLine(i)">✕</button>
            </div>
            <div v-if="editForm.servicesDetail.length === 0" class="em-srv-empty" style="padding-bottom:0;">No services added yet.</div>
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
              <input v-model="editForm.budgetCode" type="text" placeholder="400-____-_-______-____-____-____">
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
        <button class="btn btn-primary btn-sm" :disabled="isSaving || !hasChanges" @click="saveEdit">
          {{ isSaving ? 'Saving…' : 'Save changes' }}
        </button>
      </div>
    </div>
  </div>

  <!-- Decline confirmation modal -->
  <div v-if="declineOpen" class="clerk-overlay" @click.self="declineOpen = false">
    <div class="edit-modal">
      <div class="em-head">
        <h3>Decline inquiry</h3>
      </div>
      <div class="em-body">
        <p style="margin:0 0 0.4rem; font-size:0.88rem;">
          Are you sure you want to decline the inquiry from <strong>{{ inquiry?.pi.name }}</strong><template v-if="inquiry?.studyName"> for <strong>{{ inquiry?.studyName }}</strong></template>?
        </p>
        <p style="margin:0; font-size:0.82rem; color:var(--muted);">
          A notification email will be sent to the submitter. This action cannot be undone.
        </p>
      </div>
      <div class="em-foot">
        <button class="btn btn-ghost btn-sm" :disabled="isDeclining" @click="declineOpen = false">Cancel</button>
        <button class="btn btn-danger btn-sm" :disabled="isDeclining" @click="confirmDecline">
          {{ isDeclining ? 'Declining…' : 'Decline inquiry' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.meta-due { color: var(--warm); font-weight: 600; }

.decision-block {
  margin-top: 0.4rem;
  padding-top: 0.9rem;
  border-top: 1px solid var(--line);
}

.decision-label {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 600;
  color: var(--muted);
  margin-bottom: 0.5rem;
}

.decision-opt {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.3rem 0;
  cursor: pointer;
  line-height: 1.4;

  input { margin-top: 0.15rem; flex-shrink: 0; }

  &.is-disabled {
    cursor: not-allowed;
    color: var(--muted);
    input { cursor: not-allowed; }
  }
}

.decision-hint {
  font-size: 0.78rem;
  color: var(--muted);
  font-style: italic;
  margin-top: 0.35rem;
}

.hold-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 0.5rem 0 0.2rem 1.5rem;

  .hold-lbl { font-size: 0.8rem; color: var(--muted); }

  input[type='date'] {
    padding: 0.3rem 0.5rem;
    border: 1.5px solid var(--line);
    border-radius: 4px;
    font-family: inherit;
    font-size: 0.82rem;
    background: var(--card);
    color: var(--ink);
  }
}

.hold-note {
  margin-top: 0.6rem;
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--muted);

  &.due { color: var(--warm); font-weight: 600; }
}
</style>
