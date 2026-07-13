<script setup lang="ts">
import { useAdminStore } from '~/stores/admin'
import type { Affiliation } from '~/stores/admin'
import { useServicesStore } from '~/stores/services'
import { COLLECTION_TIMEPOINTS } from '~/types/index'

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

// Human labels for the expanded intake_details answers, in display order
const INTAKE_DETAIL_LABELS: Array<[string, string]> = [
  ['clinicalQuestion', 'Clinical question'],
  ['collaborators', 'Other staff & collaborators'],
  ['collectionSites', 'Collection sites'],
  ['participantNaming', 'Participant naming'],
  ['cohortCount', 'Number of cohorts'],
  ['cohortNames', 'Cohort names'],
  ['irbStatus', 'IRB status'],
  ['irbTimeline', 'IRB submission timeline'],
  ['pilotData', 'Pilot data'],
  ['pilotDataDetail', 'Pilot data detail'],
  ['enrollmentPeriod', 'Enrollment period'],
  ['firstSampleDate', 'First samples expected'],
  ['statisticalJustification', 'Statistical justification'],
  ['tubeTypes', 'Collection tubes'],
  ['specialHandling', 'Special handling'],
  ['specialHandlingNotes', 'Special handling notes'],
  ['customAssays', 'Custom panels / assays'],
  ['clinicalVariables', 'Clinical variables'],
  ['ilabsId', 'iLabs Service Request ID'],
  ['pennsieveStatus', 'Pennsieve account'],
  ['dataSharing', 'Data sharing restrictions'],
  ['dataSharingNotes', 'Data sharing detail'],
  ['sampleArrival', 'Sample arrival'],
  ['hardDeadlines', 'Hard deadlines'],
]

const intakeDetailRows = computed(() => {
  const d = inquiry.value?.intakeDetails || {}
  return INTAKE_DETAIL_LABELS
    .filter(([key]) => {
      const v = d[key]
      return v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0)
    })
    .map(([key, label]) => {
      const v = d[key]
      return { label, value: Array.isArray(v) ? v.join(', ') : String(v) }
    })
})

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
  cohortSubjects: 0,
  cohortTimepoints: 0,
  cohortSampleType: '',
  servicesDetail: [] as ServiceLine[],
})

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
  if (editForm.cohortSubjects !== q.cohortSubjects || editForm.cohortTimepoints !== q.cohortTimepoints) return true
  if (editForm.cohortSampleType !== (q.sampleType ?? '')) return true
  if (editForm.servicesDetail.length !== q.servicesDetail.length) return true
  for (let i = 0; i < editForm.servicesDetail.length; i++) {
    if (editForm.servicesDetail[i].name !== q.servicesDetail[i].name || editForm.servicesDetail[i].qty !== q.servicesDetail[i].qty) return true
  }
  return false
})

function openEdit() {
  if (!inquiry.value) return
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
  editForm.cohortSubjects = q.cohortSubjects
  editForm.cohortTimepoints = q.cohortTimepoints
  editForm.cohortSampleType = q.sampleType ?? ''
  editForm.servicesDetail = q.servicesDetail.map(s => ({ ...s }))
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
      cohortSubjects: Math.max(0, editForm.cohortSubjects),
      cohortTimepoints: Math.max(0, editForm.cohortTimepoints),
      servicesDetail,
      budgetCode: editForm.affiliation === 'Internal' ? (editForm.budgetCode.trim() || undefined) : undefined,
      fundingName: editForm.affiliation === 'Internal' ? (editForm.fundingName.trim() || undefined) : undefined,
      baName: editForm.affiliation === 'Internal' ? (editForm.baName.trim() || undefined) : undefined,
      baEmail: editForm.affiliation === 'Internal' ? (editForm.baEmail.trim() || undefined) : undefined,
      contractingContact: editForm.affiliation !== 'Internal' ? (editForm.contractingContact.trim() || undefined) : undefined,
      estimate: estimate > 0 ? estimate : undefined,
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
      <span>{{ inquiry.studyName }} · {{ inquiry.pi.name }}</span>
    </div>

    <!-- Hero -->
    <div class="detail-hero">
      <div>
        <h2>
          {{ inquiry.studyName }}
          <span class="acronym">{{ inquiry.abbreviation }}</span>
          <span class="adm-badge" :class="affiliationClass">
            <span class="dot" /> {{ inquiry.affiliation }}
          </span>
          <span v-if="inquiry.status === 'Declined'" class="adm-badge b-declined">
            <span class="dot" /> Declined
          </span>
          <span v-else-if="inquiry.status === 'Approved'" class="adm-badge b-complete">
            <span class="dot" /> Approved
          </span>
          <span v-else class="adm-badge b-review">
            <span class="dot" /> Awaiting feasibility
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
          <div class="meta-item">
            <span class="meta-label">IRB</span>
            <span class="meta-val">{{ inquiry.irb }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Cohort scope</span>
            <span class="meta-val">{{ inquiry.cohortSubjects }} subjects × {{ inquiry.cohortTimepoints }} timepoints = {{ inquiry.cohortSubjects * inquiry.cohortTimepoints }}</span>
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
        <template v-if="inquiry.status !== 'Declined' && inquiry.status !== 'Approved'">
          <span
            class="tip-left"
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
        <button class="btn btn-secondary btn-sm" style="width:100%" @click="openEdit">Edit ✎</button>
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
      <!-- Intake snapshot -->
      <div class="panel">
        <div class="panel-head">
          <h3>Intake submission</h3>
          <span class="ctx">submitted via /intake</span>
        </div>
        <div class="study-info-grid">
          <div class="info-lbl">Study objectives</div>
          <div>{{ inquiry.objectives }}</div>

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

          <template v-for="row in intakeDetailRows" :key="row.label">
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

      <!-- Right column -->
      <div style="display:flex; flex-direction:column; gap:1.2rem;">
        <div class="panel">
          <div class="panel-head"><h3>Feasibility checklist</h3></div>
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
              <label class="em-label">Subjects</label>
              <input v-model.number="editForm.cohortSubjects" type="number" min="0">
            </div>
            <div class="em-field">
              <label class="em-label">Timepoints / subject</label>
              <input v-model.number="editForm.cohortTimepoints" type="number" min="0">
            </div>
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
              <div class="em-computed">{{ editForm.cohortSubjects * editForm.cohortTimepoints }}</div>
            </div>
          </div>
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
          Are you sure you want to decline the inquiry from <strong>{{ inquiry.pi.name }}</strong> for <strong>{{ inquiry.studyName }}</strong>?
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
