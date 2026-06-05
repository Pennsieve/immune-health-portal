<script setup lang="ts">
import { useAdminStore } from '~/stores/admin'

definePageMeta({ layout: 'admin' })

const route = useRoute()
const adminStore = useAdminStore()

const study = computed(() => adminStore.studies.find(s => s.id === route.params.id))

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
      body: { studyId, agreementId },
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
      body: { studyId: study.value.id, text: noteText.value, author: adminStore.user.name },
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

const editOpen = ref(false)
const editName = ref('')
const isSaving = ref(false)

const deleteOpen = ref(false)
const isDeleting = ref(false)

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
  editName.value = study.value?.name ?? ''
  editOpen.value = true
}

async function saveEdit() {
  if (!study.value || !editName.value.trim()) return
  isSaving.value = true
  try {
    await adminStore.updateStudyName(study.value.id, editName.value.trim())
    editOpen.value = false
  }
  catch {
    alert('Failed to save. Please try again.')
  }
  finally {
    isSaving.value = false
  }
}

const stageClass = computed(() => {
  if (!study.value) return ''
  if (study.value.stage === 'Complete') return 'b-complete'
  if (study.value.stage === 'Processing') return 'b-processing'
  if (study.value.stage === 'Awaiting Signature' || study.value.stage === 'Agreement') return 'b-agreement'
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
            <span class="meta-val">{{ study.cohort.subjects }} × {{ study.cohort.timepoints }} = {{ study.cohort.totalSamples }} samples</span>
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
        <button class="btn btn-secondary btn-sm" @click="openEdit">Edit study record</button>
        <button class="btn btn-danger btn-sm" @click="deleteOpen = true">Delete study record</button>
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
          is still awaiting Dr. {{ study.pi.name.replace('Dr. ', '') }}'s signature.
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
    <div v-if="activeTab === 'overview'" class="dt-grid">
      <div class="panel">
        <div class="panel-head"><h3>Study summary</h3></div>
        <div class="study-info-grid">
          <div class="info-lbl">Objectives</div>
          <div>{{ study.objectives }}</div>

          <div class="info-lbl">PI / Lead</div>
          <div>
            {{ study.pi.name }} (PI)
            <template v-if="study.studyLead"> · {{ study.studyLead.name }} (lead) · <span class="mono">{{ study.studyLead.email }}</span></template>
          </div>

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
        </div>
      </div>

      <div>

        <div v-if="study.quickStats" class="panel">
          <div class="panel-head"><h3>Quick stats</h3></div>
          <div class="quick-stats">
            <div class="qs-card">
              <div class="qs-lbl">Samples received</div>
              <div class="qs-val" style="color:var(--green)">{{ study.quickStats.samplesReceived }} / {{ study.quickStats.samplesTotal }}</div>
            </div>
            <div class="qs-card">
              <div class="qs-lbl">CyTOF acquired</div>
              <div class="qs-val" style="color:var(--gold)">{{ study.quickStats.cytofAcquired }} / {{ study.quickStats.cytofTotal }}</div>
            </div>
            <div class="qs-card">
              <div class="qs-lbl">QC passed</div>
              <div class="qs-val" style="color:var(--accent)">{{ study.quickStats.qcPassed }} / {{ study.quickStats.qcTotal }}</div>
            </div>
            <div class="qs-card">
              <div class="qs-lbl">Invoiced YTD</div>
              <div class="qs-val" style="color:var(--warm)">${{ study.quickStats.invoicedYtd.toLocaleString() }}</div>
            </div>
          </div>
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
          <NuxtLink :to="'/admin/sign/' + study.id + '-psa'" class="btn btn-primary btn-sm">
            Preview PI sign view →
          </NuxtLink>
        </div>

        <div style="margin-top:1.8rem; padding-top:1.4rem; border-top:1px solid rgba(0,0,0,0.06); max-width:520px; margin-left:auto; margin-right:auto;">
          <div style="font-size:0.66rem; text-transform:uppercase; letter-spacing:0.1em; color:var(--muted); font-weight:600; margin-bottom:0.6rem">Planned scope at activation</div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.8rem; text-align:left;">
            <div style="padding:0.7rem 0.9rem; background:var(--cream); border-radius:var(--radius);">
              <div style="font-size:0.62rem; text-transform:uppercase; letter-spacing:0.1em; color:var(--muted); font-weight:600">Subjects</div>
              <div class="mono" style="font-size:1.1rem; font-weight:500">{{ study.cohort.subjects }}</div>
            </div>
            <div style="padding:0.7rem 0.9rem; background:var(--cream); border-radius:var(--radius);">
              <div style="font-size:0.62rem; text-transform:uppercase; letter-spacing:0.1em; color:var(--muted); font-weight:600">Timepoints / subject</div>
              <div class="mono" style="font-size:1.1rem; font-weight:500">{{ study.cohort.timepoints }}</div>
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
          <div class="info-lbl">Timepoints</div>
          <div>{{ study.cohort.timepoints }}</div>
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
    <div class="edit-modal">
      <div class="em-head">
        <h3>Edit study</h3>
      </div>
      <div class="em-body">
        <label class="em-label">Study name</label>
        <input
          v-model="editName"
          type="text"
          autofocus
          @keydown.enter="saveEdit"
          @keydown.escape="editOpen = false"
        >
      </div>
      <div class="em-foot">
        <button class="btn btn-ghost btn-sm" @click="editOpen = false">Cancel</button>
        <button
          class="btn btn-primary btn-sm"
          :disabled="isSaving || !editName.trim()"
          @click="saveEdit"
        >
          {{ isSaving ? 'Saving…' : 'Save' }}
        </button>
      </div>
    </div>
  </div>
</template>
