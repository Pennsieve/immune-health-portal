<script setup lang="ts">
import { useAdminStore } from '~/stores/admin'
import type { Affiliation } from '~/stores/admin'
import { useServicesStore } from '~/stores/services'
import { COLLECTION_TIMEPOINTS } from '~/types/index'
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

// Lead phase: the full intake form hasn't been submitted yet
const isLead = computed(() =>
  inquiry.value?.status === 'Lead' || inquiry.value?.status === 'Intake Sent',
)
// Lead-form answers (role, referral source, …) — shown for the whole lifecycle
const leadRows = computed(() => leadDetailRows(inquiry.value?.leadDetails))

// Read-only rows for the expanded intake answers (schema-driven: raw value -> label)
const detailRows = computed(() => intakeDetailRows(inquiry.value?.intakeDetails))
// Fields the edit modal shows, grouped by section (from the shared schema)
const fieldsBySection = INTAKE_SECTIONS.map(section => ({
  section,
  fields: INTAKE_FIELDS.filter(f => f.section === section),
}))

const TIMEPOINTS = COLLECTION_TIMEPOINTS
const collectionGroups = computed(() => inquiry.value?.collectionGroups || [])
const groupTotal = (g: { subjects: number; samples: Record<string, number> }) =>
  (Number(g.subjects) || 0) * TIMEPOINTS.reduce((s, tp) => s + (Number(g.samples?.[tp.key]) || 0), 0)
const matrixGrandTotal = computed(() =>
  collectionGroups.value.reduce((s, g) => s + groupTotal(g), 0),
)

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

async function toggleFeasibility(item: { label: string; checked: boolean }) {
  if (!inquiry.value) return
  item.checked = !item.checked
  try {
    await $fetch('/api/admin/update-inquiry-feasibility', {
      method: 'POST',
      body: { inquiryId: inquiry.value.id, feasibility: inquiry.value.feasibility },
    })
  }
  catch {
    item.checked = !item.checked
  }
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

// Only full intakes awaiting review are editable: leads have no study fields
// yet, and approved / declined inquiries are terminal.
const isEditable = computed(() => inquiry.value?.status === 'New')

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
  objectives: '',
  phlebotomy: '',
  metadata: '',
  cohortSampleType: '',
  servicesDetail: [] as ServiceLine[],
  intakeDetails: {} as Record<string, unknown>,
  collectionGroups: [] as Array<{ name: string; subjects: number; samples: Record<string, number> }>,
})

// Normalise a cohort matrix to numeric cells for comparison / saving
function normalizeGroups(groups: Array<{ name: string; subjects: number; samples: Record<string, number> }>) {
  return groups.map(g => ({
    name: g.name || '',
    subjects: Number(g.subjects) || 0,
    samples: Object.fromEntries(TIMEPOINTS.map(tp => [tp.key, Number(g.samples?.[tp.key]) || 0])),
  }))
}

function addEditGroup() {
  editForm.collectionGroups.push({
    name: '',
    subjects: 0,
    samples: Object.fromEntries(TIMEPOINTS.map(tp => [tp.key, 0])),
  })
}
function removeEditGroup(i: number) {
  editForm.collectionGroups.splice(i, 1)
}

// Cohort scope is derived from the edited matrix, not entered by hand.
const editMatrixSubjects = computed(() =>
  editForm.collectionGroups.reduce((s, g) => s + (Number(g.subjects) || 0), 0),
)
const editMatrixTotal = computed(() =>
  editForm.collectionGroups.reduce(
    (s, g) => s + (Number(g.subjects) || 0)
      * TIMEPOINTS.reduce((a, tp) => a + (Number(g.samples?.[tp.key]) || 0), 0),
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
  if (editForm.objectives.trim() !== (q.objectives ?? '')) return true
  if (editForm.phlebotomy !== (q.phlebotomy ?? '')) return true
  if (editForm.metadata !== (q.metadata ?? '')) return true
  if (editMatrixSubjects.value !== q.cohortSubjects) return true
  if (editForm.cohortSampleType !== (q.sampleType ?? '')) return true
  if (editForm.servicesDetail.length !== q.servicesDetail.length) return true
  for (let i = 0; i < editForm.servicesDetail.length; i++) {
    if (editForm.servicesDetail[i].name !== q.servicesDetail[i].name || editForm.servicesDetail[i].qty !== q.servicesDetail[i].qty) return true
  }
  // Expanded intake answers
  if (JSON.stringify(cleanIntakeDetails(editForm.intakeDetails)) !== JSON.stringify(cleanIntakeDetails(q.intakeDetails ?? {}))) return true
  // Cohort sample matrix
  if (JSON.stringify(normalizeGroups(editForm.collectionGroups)) !== JSON.stringify(normalizeGroups(q.collectionGroups ?? []))) return true
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
  editForm.objectives = q.objectives ?? ''
  editForm.phlebotomy = q.phlebotomy ?? ''
  editForm.metadata = q.metadata ?? ''
  editForm.cohortSampleType = q.sampleType ?? ''
  editForm.servicesDetail = q.servicesDetail.map(s => ({ ...s }))
  editForm.intakeDetails = JSON.parse(JSON.stringify(q.intakeDetails ?? {}))
  editForm.collectionGroups = normalizeGroups(q.collectionGroups ?? [])
  newServiceId.value = ''
  editOpen.value = true
}

async function saveEdit() {
  if (!inquiry.value || !editForm.studyName.trim()) return
  isSaving.value = true
  try {
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
      objectives: editForm.objectives.trim() || undefined,
      phlebotomy: editForm.phlebotomy || undefined,
      metadata: editForm.metadata || undefined,
      sampleType: editForm.cohortSampleType || undefined,
      cohortSubjects: editMatrixSubjects.value,
      servicesDetail,
      budgetCode: editForm.affiliation === 'Internal' ? (editForm.budgetCode.trim() || undefined) : undefined,
      fundingName: editForm.affiliation === 'Internal' ? (editForm.fundingName.trim() || undefined) : undefined,
      baName: editForm.affiliation === 'Internal' ? (editForm.baName.trim() || undefined) : undefined,
      baEmail: editForm.affiliation === 'Internal' ? (editForm.baEmail.trim() || undefined) : undefined,
      contractingContact: editForm.affiliation !== 'Internal' ? (editForm.contractingContact.trim() || undefined) : undefined,
      estimate: estimate > 0 ? estimate : undefined,
      intakeDetails: cleanIntakeDetails(editForm.intakeDetails),
      collectionGroups: normalizeGroups(editForm.collectionGroups),
    })
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
          <div v-if="inquiry.estimate" class="meta-item">
            <span class="meta-label">Estimate</span>
            <span class="meta-val">${{ inquiry.estimate.toLocaleString() }}</span>
          </div>
          <div v-if="inquiry.sampleType" class="meta-item">
            <span class="meta-label">Sample type</span>
            <span class="meta-val">{{ inquiry.sampleType }}</span>
          </div>
        </div>
      </div>
      <div class="hero-actions">
        <template v-if="isLead">
          <span
            class="tip-left"
            style="width:100%"
            :data-tip="!feasibilityComplete ? 'Complete the lead checklist below before sending the intake form' : undefined"
          >
            <button
              class="btn btn-primary"
              style="width:100%"
              :disabled="isSendingIntake || isDeclining || !feasibilityComplete"
              @click="sendIntakeForm"
            >
              {{ isSendingIntake ? 'Sending…' : (inquiry.status === 'Intake Sent' ? 'Re-send full intake form ✉' : 'Send full intake form ✉') }}
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
        <!-- Approved / declined inquiries are terminal — no Edit button at all -->
        <span
          v-if="inquiry.status !== 'Approved' && inquiry.status !== 'Declined'"
          class="tip-left"
          style="width:100%"
          :data-tip="!isEditable ? 'Editing is available once the full intake form has been submitted' : undefined"
        >
          <button class="btn btn-secondary btn-sm" style="width:100%" :disabled="!isEditable" @click="openEdit">Edit ✎</button>
        </span>
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
              <div class="info-lbl">Full intake</div>
              <div>
                <template v-if="inquiry.status === 'Intake Sent'">
                  Form sent {{ inquiry.intakeSentDate }} — awaiting submission.
                </template>
                <template v-else>
                  Not sent yet. After your conversation with the lead, use “Send full intake form” to email them the study questionnaire.
                </template>
              </div>
            </template>
          </div>
        </div>

        <!-- Intake snapshot (full study questionnaire) -->
        <div v-if="!isLead" class="panel">
          <div class="panel-head">
            <h3>Intake submission</h3>
            <span class="ctx">submitted via the emailed intake form</span>
          </div>
          <div class="study-info-grid">
            <div class="info-lbl">Study objectives</div>
            <div>{{ inquiry.objectives || '—' }}</div>

          <template v-if="inquiry.studyLead">
            <div class="info-lbl">Project lead</div>
            <div>{{ inquiry.studyLead.name }} · <span class="mono">{{ inquiry.studyLead.email }}</span></div>
          </template>

          <template v-if="inquiry.phlebotomy">
            <div class="info-lbl">Phlebotomy</div>
            <div>{{ inquiry.phlebotomy }}</div>
          </template>

          <template v-if="inquiry.metadata">
            <div class="info-lbl">Metadata plan</div>
            <div>{{ inquiry.metadata }}</div>
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

          <template v-if="collectionGroups.length">
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
                  <tr v-for="(g, i) in collectionGroups" :key="i">
                    <td>{{ g.name || '—' }}</td>
                    <td class="mono">{{ g.subjects }}</td>
                    <td v-for="tp in TIMEPOINTS" :key="tp.key" class="mono">{{ g.samples?.[tp.key] || 0 }}</td>
                    <td class="mono">{{ groupTotal(g).toLocaleString() }}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr>
                    <td>Total</td>
                    <td class="mono">{{ collectionGroups.reduce((s, g) => s + (Number(g.subjects) || 0), 0).toLocaleString() }}</td>
                    <td v-for="tp in TIMEPOINTS" :key="tp.key" class="mono">
                      {{ collectionGroups.reduce((s, g) => s + (Number(g.subjects) || 0) * (Number(g.samples?.[tp.key]) || 0), 0).toLocaleString() }}
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
          </div>
        </div>

        <div class="panel">
          <div class="panel-head"><h3>Reviewer notes</h3></div>
          <div v-if="inquiry.notes.length" class="activity-timeline" style="max-height:260px; overflow-y:auto;">
            <div v-for="note in inquiry.notes" :key="note.date" class="t-item">
              <div class="t-dot m" />
              <div class="t-body">
                <div class="t-title">{{ note.author }}</div>
                <div class="t-meta">{{ note.date }}</div>
                <div class="t-note">{{ note.text }}</div>
              </div>
            </div>
          </div>
          <div v-else style="padding:0.8rem 1.4rem; font-size:0.84rem; color:var(--muted)">
            No notes yet.
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
              <label class="em-label">Study name *</label>
              <input v-model="editForm.studyName" type="text" autofocus @keydown.escape="editOpen = false">
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
            <div v-if="editForm.servicesDetail.length === 0" class="em-srv-empty">No services added yet.</div>
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
                <tr v-for="(g, i) in editForm.collectionGroups" :key="i">
                  <td><input v-model="g.name" type="text" placeholder="Cohort name"></td>
                  <td><input v-model.number="g.subjects" type="number" min="0"></td>
                  <td v-for="tp in TIMEPOINTS" :key="tp.key">
                    <input v-model.number="g.samples[tp.key]" type="number" min="0">
                  </td>
                  <td><button class="em-srv-remove" type="button" @click="removeEditGroup(i)">✕</button></td>
                </tr>
                <tr v-if="!editForm.collectionGroups.length">
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
        <button class="btn btn-primary btn-sm" :disabled="isSaving || !editForm.studyName.trim() || !hasChanges" @click="saveEdit">
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
